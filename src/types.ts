/*
 * Shared options, whether using an id or username to lookup the user
 */
interface CommonOpts {
    token?: string;
    repository?: string;
}

/*
 * Options when looking up by username
 */
interface UsernameOpts extends CommonOpts {
    username: string;
}

/*
 * Options when looking up by user id
 */
interface IdOpts extends CommonOpts {
    id: number;
}

/*
 * Actual options set
 */
export type GitHubEmailOpts = UsernameOpts | IdOpts;

/*
 * Return type when looking at recent commits history
 */
export type RecentCommitsResult = { name: string; email: string }[];

/*
 * Return value
 */
export interface GitHubEmailResult {
    github: string | null;
    npm: string | null;
    recentActivity: string[];
    recentCommits: RecentCommitsResult;
}
