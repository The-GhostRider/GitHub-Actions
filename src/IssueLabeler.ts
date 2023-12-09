import * as core from '@actions/core'
import * as github from '@actions/github'
import {Webhooks} from '@octokit/webhooks'

export class IssueLabeler {
  private octokit: github.GitHub
  constructor(token: string) {
    this.octokit = new github.GitHub(token)
  }

  async LabelCurrentContextIssue(): Promise<void> {
    const context = github.context

    if (context.eventName !== 'issues')
      throw new Error(`Event '${context.eventName}' is not supported`)

    const rawPayload = github.context.payload
    core.debug(`rawPayload: ${JSON.stringify(rawPayload)}`)

    const payload = rawPayload as Webhooks.WebhookPayloadIssues
    switch (payload.action) {
      case 'opened':
        await this.SetMissingHashLabel(payload.issue)
        break
      default:
        throw new Error(`Unhandled issue action ${payload.action}`)
    }
  }

  private async SetMissingHashLabel(
    issue: Webhooks.WebhookPayloadIssuesIssue
  ): Promise<void> {
    core.debug('SetMissingHashLabel start')

    const body = issue.body
    const regex = new RegExp('\\b[a-f0-9]{7,40}\\b', 'gi')
    let matches = regex.exec(body)

    let found = false

    while (matches !== null) {
      const element = matches[0]
      core.debug(`Checking '${element}' as valid commit SHA`)
      matches = regex.exec(body)

      try {
        await this.octokit.request(
          `GET ${issue.repository_url}/commits/${element}`,
          {
            mediaType: {
              format: 'sha+json'
            }
          }
        )

        core.debug(`Found valid commit SHA '${element}'`)
        found = true
        break
      } catch (error) {
        core.debug(`'${element}' is not a valid SHA commit`)
        core.debug(error)
      }
    }

    if (!found)
      await this.SetLabel(issue, 'Invalid - Missing information')

    core.debug('SetMissingHashLabel end')
  }

  private async SetLabel(
    issue: Webhooks.WebhookPayloadIssuesIssue,
    label: string
  ): Promise<void> {
    await this.octokit.request(
      `POST ${issue.labels_url.replace('{/name}', '')}`,
      {
        labels: [label]
      }
    )
  }
}
