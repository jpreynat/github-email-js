import fetch from 'isomorphic-fetch';

import {
    GitHubEmailOpts,
    GitHubEmailResult,
    RecentCommitsResult
} from './types';

/*
 * Try to find the email associated to a GitHub user account
 */
export async function githubEmail(
    opts: GitHubEmailOpts
): Promise<GitHubEmailResult> {
    const username = await getUsername(opts);
    if (!username) {
        throw new Error(
            'Could not find a GitHub user with the provided options. Please double check before retrying.'
        );
    }

    const github = await getGitHubEmail(username, opts);
    const npm = await getNpmEmail(username);
    const recentCommits = await getRecentCommitsEmails(username, opts);
    const recentActivity = await getRecentActivityEmails(username, opts);

    return {
        github,
        npm,
        recentCommits,
        recentActivity
    };
}

/*
 * Retrieve the GitHub username if the user ID was passed
 */
async function getUsername(opts: GitHubEmailOpts): Promise<string | null> {
    if ('username' in opts) {
        return opts.username;
    }

    const response = await fetch(`https://api.github.com/user/${opts.id}`, {
        headers: getGitHubAPIHeaders(opts.token)
    });
    if (response.status === 404) {
        return null;
    }

    const json = await response.json();
    return json.login;
}

/*
 * Get user's email from npm
 */
async function getGitHubEmail(
    username: string,
    opts: GitHubEmailOpts
): Promise<string | null> {
    if (!opts.token) {
        return null;
    }

    const response = await fetch(`https://api.github.com/users/${username}`, {
        headers: getGitHubAPIHeaders(opts.token)
    });
    if (response.status === 404) {
        return null;
    }

    const json = await response.json();
    return json.email || null;
}

/*
 * Get user's email from npm
 */
async function getNpmEmail(username: string): Promise<string | null> {
    const response = await fetch(
        `https://r.cnpmjs.org/-/user/org.couchdb.user:${username}`
    );
    if (response.status === 404) {
        return null;
    }

    const json = await response.json();
    return json.email || null;
}

/*
 * Get emails listed in recent user's activity
 */
async function getRecentActivityEmails(
    username: string,
    opts: GitHubEmailOpts
): Promise<string[]> {
    const recentActivityEmails: string[] = [];

    const response = await fetch(
        `https://api.github.com/users/${username}/events`,
        {
            headers: getGitHubAPIHeaders(opts.token)
        }
    );
    if (response.status === 404) {
        return recentActivityEmails;
    }

    // It's easier in events to look directly using a RegExp as
    // we would have to check every type of possible events otherwise
    const json = await response.text();
    const emailRegExp = /"email":"([^"]*)"/gm;

    const initialMatch = emailRegExp.exec(json);
    if (initialMatch) {
        recentActivityEmails.push(initialMatch[1]);
    }

    while (emailRegExp.lastIndex !== 0) {
        const match = emailRegExp.exec(json);
        if (match) {
            recentActivityEmails.push(match[1]);
        }
    }

    return recentActivityEmails;
}

/*
 * Get emails and names listed in recent user's repository commits
 */
async function getRecentCommitsEmails(
    username: string,
    opts: GitHubEmailOpts
): Promise<RecentCommitsResult> {
    const repository = await getRepository(username, opts);
    if (!repository) {
        return [];
    }

    const response = await fetch(
        `https://api.github.com/repos/${username}/${repository}/commits`,
        {
            headers: getGitHubAPIHeaders(opts.token)
        }
    );
    if (response.status === 404) {
        return [];
    }

    const json = await response.json();
    if (!Array.isArray(json) || json.length === 0) {
        return [];
    }

    // Iterate over the commits authors and committers
    // We prevent overwriting the email for an identical name during reduce as
    // newer commits as listed first
    const commitsEmailsMap = json.reduce<
        Map<string, { name: string; email: string; date: Date }>
    >((acc, commitJson) => {
        const { commit = {} } = commitJson;
        const { author = {}, committer = {} } = commit;
        const {
            name: authorName,
            email: authorEmail,
            date: authorDate
        } = author;
        const {
            name: committerName,
            email: committerEmail,
            date: committerDate
        } = committer;

        if (authorName && !acc.has(authorName)) {
            acc.set(authorName, {
                name: authorName,
                email: authorEmail,
                date: new Date(authorDate)
            });
        }

        if (committerName && !acc.has(committerName)) {
            acc.set(committerName, {
                name: committerName,
                email: committerEmail,
                date: new Date(committerDate)
            });
        }

        return acc;
    }, new Map());

    const recentCommitsResult: RecentCommitsResult = [
        ...commitsEmailsMap.values()
    ]
        .sort((a, b) => {
            return a.date > b.date ? -1 : 1;
        })
        .map(({ name, email }) => ({
            name,
            email
        }));

    return recentCommitsResult;
}

/*
 * Get the repository on which we fetch the recent commits.
 * Use the options' one if passed, or look for the more recently updated.
 */
async function getRepository(
    username: string,
    opts: GitHubEmailOpts
): Promise<string | null> {
    if (opts.repository) {
        return opts.repository;
    }

    const response = await fetch(
        `https://api.github.com/users/${username}/repos?type=owner&sort=pushed`,
        {
            headers: getGitHubAPIHeaders(opts.token)
        }
    );
    if (response.status === 404) {
        return null;
    }

    const json = await response.json();
    if (!Array.isArray(json) || json.length === 0) {
        return null;
    }

    return json[0].name;
}

/*
 * Helper to compute headers for GitHub's API
 */
function getGitHubAPIHeaders(token?: string) {
    const authHeader: { [key: string]: string } = token
        ? {
              Authorization: `token ${token}`
          }
        : {};

    return new Headers({
        ...authHeader,
        Accept: 'application/vnd.github.v3+json'
    });
}
