/**
 * GitHub CLI Integration
 * 
 * Uses the gh CLI for fetching PRs and issues.
 * Benefits of using gh CLI instead of API:
 * - Already authenticated on your machine
 * - No need to manage tokens
 * - Handles org SSO automatically
 * - Simpler for personal use
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

/**
 * Check if gh CLI is installed and authenticated
 */
async function isGhCliAvailable() {
  try {
    await execAsync('gh auth status');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Execute a gh CLI command and return parsed JSON
 */
async function ghCommand(args) {
  try {
    const { stdout } = await execAsync(`gh ${args}`);
    if (!stdout.trim()) {
      return [];
    }
    return JSON.parse(stdout);
  } catch (error) {
    // Handle specific error cases
    if (error.message.includes('gh: command not found')) {
      throw new Error('GitHub CLI (gh) is not installed. Install it from https://cli.github.com/');
    }
    if (error.message.includes('not logged in')) {
      throw new Error('Not authenticated with GitHub CLI. Run "gh auth login" to authenticate.');
    }
    console.error('GitHub CLI error:', error.message);
    throw error;
  }
}

/**
 * Fetch PRs that need your review
 * @param {string[]} repos - List of repos in format "owner/repo"
 */
async function fetchPRsToReview(repos = []) {
  const repoFilter = repos.length > 0 
    ? repos.map(r => `repo:${r}`).join(' ')
    : '';
  
  const query = `is:pr is:open review-requested:@me ${repoFilter}`.trim();
  
  try {
    const prs = await ghCommand(
      `search prs "${query}" --json number,title,url,repository,createdAt,updatedAt --limit 50`
    );
    
    return prs.map(pr => ({
      id: `${pr.repository.name}#${pr.number}`,
      number: pr.number,
      title: pr.title,
      url: pr.url,
      repo: pr.repository.name,
      repoFullName: pr.repository.nameWithOwner,
      createdAt: pr.createdAt,
      updatedAt: pr.updatedAt,
      type: 'review-requested',
    }));
  } catch (error) {
    console.error('Error fetching PRs to review:', error.message);
    throw error;
  }
}

/**
 * Fetch your PRs that need attention
 * @param {string[]} repos - List of repos in format "owner/repo"
 */
async function fetchMyPRs(repos = []) {
  const repoFilter = repos.length > 0 
    ? repos.map(r => `repo:${r}`).join(' ')
    : '';
  
  const query = `is:pr is:open author:@me ${repoFilter}`.trim();
  
  try {
    const prs = await ghCommand(
      `search prs "${query}" --json number,title,url,repository,createdAt,updatedAt,state --limit 50`
    );
    
    return prs.map(pr => ({
      id: `${pr.repository.name}#${pr.number}`,
      number: pr.number,
      title: pr.title,
      url: pr.url,
      repo: pr.repository.name,
      repoFullName: pr.repository.nameWithOwner,
      createdAt: pr.createdAt,
      updatedAt: pr.updatedAt,
      state: pr.state,
      type: 'authored',
    }));
  } catch (error) {
    console.error('Error fetching my PRs:', error.message);
    throw error;
  }
}

/**
 * Fetch issues assigned to you
 * @param {string[]} repos - List of repos in format "owner/repo"
 * @param {string[]} labels - Optional labels to filter by (e.g., ['copilot'])
 */
async function fetchAssignedIssues(repos = [], labels = []) {
  const repoFilter = repos.length > 0 
    ? repos.map(r => `repo:${r}`).join(' ')
    : '';
  
  const labelFilter = labels.length > 0
    ? labels.map(l => `label:${l}`).join(' ')
    : '';
  
  const query = `is:issue is:open assignee:@me ${repoFilter} ${labelFilter}`.trim();
  
  try {
    const issues = await ghCommand(
      `search issues "${query}" --json number,title,url,repository,labels,createdAt,updatedAt --limit 50`
    );
    
    return issues.map(issue => ({
      id: `${issue.repository.name}#${issue.number}`,
      number: issue.number,
      title: issue.title,
      url: issue.url,
      repo: issue.repository.name,
      repoFullName: issue.repository.nameWithOwner,
      labels: issue.labels.map(l => l.name),
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      type: 'assigned',
    }));
  } catch (error) {
    console.error('Error fetching assigned issues:', error.message);
    throw error;
  }
}

/**
 * Fetch Copilot-assigned issues
 * @param {string[]} repos - List of repos in format "owner/repo"
 */
async function fetchCopilotAssignedIssues(repos = []) {
  // Filter by 'copilot' label for Copilot-assigned issues
  return fetchAssignedIssues(repos, ['copilot']);
}

/**
 * Fetch all GitHub data at once
 * @param {string[]} repos - List of repos in format "owner/repo"
 */
async function fetchAllGitHubData(repos = []) {
  try {
    const [prsToReview, myPRs, assignedIssues] = await Promise.all([
      fetchPRsToReview(repos).catch(err => {
        console.error('Failed to fetch PRs to review:', err.message);
        return [];
      }),
      fetchMyPRs(repos).catch(err => {
        console.error('Failed to fetch my PRs:', err.message);
        return [];
      }),
      fetchAssignedIssues(repos).catch(err => {
        console.error('Failed to fetch assigned issues:', err.message);
        return [];
      }),
    ]);

    return {
      prsToReview,
      myPRs,
      assignedIssues,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching GitHub data:', error.message);
    throw error;
  }
}

/**
 * Get details for a specific PR
 * @param {string} repoFullName - Repo in format "owner/repo"
 * @param {number} prNumber - PR number
 */
async function getPRDetails(repoFullName, prNumber) {
  try {
    const pr = await ghCommand(
      `pr view ${prNumber} --repo ${repoFullName} --json number,title,body,url,state,author,createdAt,updatedAt,reviews,reviewDecision,statusCheckRollup`
    );
    
    return {
      number: pr.number,
      title: pr.title,
      body: pr.body,
      url: pr.url,
      state: pr.state,
      author: pr.author?.login,
      createdAt: pr.createdAt,
      updatedAt: pr.updatedAt,
      reviews: pr.reviews || [],
      reviewDecision: pr.reviewDecision,
      ciStatus: pr.statusCheckRollup,
    };
  } catch (error) {
    console.error('Error fetching PR details:', error.message);
    throw error;
  }
}

/**
 * Get details for a specific issue
 * @param {string} repoFullName - Repo in format "owner/repo"
 * @param {number} issueNumber - Issue number
 */
async function getIssueDetails(repoFullName, issueNumber) {
  try {
    const issue = await ghCommand(
      `issue view ${issueNumber} --repo ${repoFullName} --json number,title,body,url,state,author,createdAt,updatedAt,labels,assignees`
    );
    
    return {
      number: issue.number,
      title: issue.title,
      body: issue.body,
      url: issue.url,
      state: issue.state,
      author: issue.author?.login,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      labels: issue.labels.map(l => l.name),
      assignees: issue.assignees.map(a => a.login),
    };
  } catch (error) {
    console.error('Error fetching issue details:', error.message);
    throw error;
  }
}

module.exports = {
  isGhCliAvailable,
  fetchPRsToReview,
  fetchMyPRs,
  fetchAssignedIssues,
  fetchCopilotAssignedIssues,
  fetchAllGitHubData,
  getPRDetails,
  getIssueDetails,
};
