import { GITHUB_EVENTS, GITHUB_REPOS } from "../constant.js";
import { sendEmail } from "../utility.js";

async function getGithubRepos() {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const query = `
        query {
          viewer {
            repositories(first: 10, orderBy: {field: UPDATED_AT, direction: DESC}) {
              nodes {
                name
                description
                url
                isPrivate
                primaryLanguage {
                  name
                }
                updatedAt
                createdAt
                pushedAt
                defaultBranchRef {
                  target {
                    ... on Commit {
                      message
                      committedDate
                    }
                  }
                }
              }
            }
          }
        }
    `;
  console.log("Fetching repositories...");
  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    const json = await response.json();

    const data =  json.data.viewer.repositories.nodes.map((repo) => ({
      name: repo.name,
      description: repo.description || null,
      url: repo.url,
      private: repo.isPrivate,
      language: repo.primaryLanguage
        ? repo.primaryLanguage.name
        : null,
      lastUpdated: new Date(repo.updatedAt).toDateString(),
      createdAt: new Date(repo.createdAt).toDateString(),
      pushedAt: new Date(repo.pushedAt).toDateString(),
      lastCommitMessage: repo.defaultBranchRef?.target?.message || null,
      lastCommitDate:
        repo.defaultBranchRef?.target?.committedDate || null,
    }));
    return {
      data,
      dataFrom: GITHUB_REPOS
    }
  } catch (error) {
    console.error("Error fetching repositories:", error);
    return {
      data: [],
      dataFrom: GITHUB_REPOS
    }
  }
}

async function getRecentEvents() {
  console.log("Fetching recent events...");
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const url = "https://api.github.com/graphql";

  const query = `
    query {
      viewer {
        login
        repositories(first: 10, orderBy: { field: UPDATED_AT, direction: DESC }) {
          nodes {
            name
            isPrivate
            defaultBranchRef {
              target {
                ... on Commit {
                  history(first: 3) {
                    edges {
                      node {
                        message
                        committedDate
                      }
                    }
                  }
                }
              }
            }
            stargazers {
              totalCount
            }
            forks {
              totalCount
            }
          }
        }
      }
    }
  `;

  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const result = await response.json();
    const events = result.data.viewer.repositories.nodes.filter(repo => repo !== null).map((repo) => ({
      repo: repo.name,
      isPrivate: repo.isPrivate,
      url: `https://github.com/${result.data.viewer.login}/${repo.name}`,
      commits: repo.defaultBranchRef?.target?.history.edges.map(
        (edge) => edge.node.message
      ) || [],
      stars: repo.stargazers.totalCount,
      forks: repo.forks.totalCount,
    }));

    return {
      data: events,
      dataFrom: GITHUB_EVENTS
    }
  } catch (error) {
    console.error("Error fetching GitHub events:", error);
    return {
      data: [],
      dataFrom: GITHUB_EVENTS
    }
  }
}

async function sendEmailToSuraj(subject, email, name, message){
  console.log("Sending email to Suraj...");
  const toEmail = process.env.MY_EMAIL;
  const isSent = await sendEmail(toEmail, subject, {
    name,
    email,
    message
  }, true);
  console.log("******************Email sent to Suraj:", isSent);
  return {
    status: isSent ? "Success" : "Failed"
  };
}

export { getGithubRepos, getRecentEvents, sendEmailToSuraj };