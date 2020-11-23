# github-email-js

This module replicates the great [github-email](https://github.com/paulirish/github-email) CLI as a pure JS module.

## Main differences with github-email

There are just a few differences between how this module behaves compared to the original [github-email](https://github.com/paulirish/github-email) CLI.

### Fixed npm email

The CLI still fetches the npm email from the `https://registry.npmjs.org/-/user/org.couchdb.user` deprecated endpoint, leading to an always `null` value for npm.

This module instead uses the mirror used by [sindresorhus/npm-email](https://github.com/sindresorhus/npm-email/blob/master/index.js#L13-L16) that properly resolves the email for the user.

### Emails from recenty activity and recent commits

In [github-email](https://github.com/paulirish/github-email), the recent activity and recent commits sections seem to be reversed:
- "Emails from recent commits" fetches from the `https://api.github.com/users/$user/events` endpoint,
- "Emails from owned-repo recent activity" fetches from the `https://api.github.com/repos/$user/$repo/commits` endpoint.

This module instead returns the emails found:
- in the `/events` endpoint in the `recentActivity` result field,
- in the `/commits` endpoint in the `recentCommits` result field.

### Default repository used for recent commits history

When no repository is passed as an option, the [github-email](https://github.com/paulirish/github-email) CLI resolves to the lastly "updated" one on GitHub. But a very old repo can have its name or description updated, while not having seen any new commits for a few years.

Since the repository is used to lookup emails in recent commits, this module instead resolves to the user's lastly "pushed" repository.

### Optional lookup by id

Since this module can be used programmatically, as compared to the original CLI, it eases up the lookup by allowing passing the GitHub user's id instead of its username.

This can be useful when working with authentication systems that record only the user's id, such as Firebase.

## Install

```sh
$ yarn add github-email-js
```

## Usage

### Lookup by username

```ts
import { githubEmail } from 'github-email-js';

const {
    npm,
    recentActivity,
    recentCommits
} = await githubEmail({
    username: 'jpreynat'
});
```

### Lookup by id

```ts
import { githubEmail } from 'github-email-js';

const {
    npm,
    recentActivity,
    recentCommits
} = await githubEmail({
    id: 7927876
});
```

### Allow returning email from GitHub's API

To read the email from GitHub's API, [we need authentication](https://docs.github.com/en/free-pro-team@latest/rest/reference/users#get-a-user).

```ts
import { githubEmail } from 'github-email-js';

const {
    github,
    npm,
    recentActivity,
    recentCommits
} = await githubEmail({
    username: 'jpreynat',
    token: '<your-github-token>'
});
```

### Manually select the repository in which to lookup recent commits history

Otherwise, the default is to lookup in the lastly "pushed" owner's repository.

```ts
import { githubEmail } from 'github-email-js';

const {
    github,
    npm,
    recentActivity,
    recentCommits
} = await githubEmail({
    username: 'jpreynat',
    token: '<your-github-token>',
    repository: 'github-email-js'
});
```
