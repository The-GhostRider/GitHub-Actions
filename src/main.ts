import * as core from '@actions/core'

async function run(): Promise<void> {
  try {
    core.debug('Started')

    core.debug('Finished')
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
