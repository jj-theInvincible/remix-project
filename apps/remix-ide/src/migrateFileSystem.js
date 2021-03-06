import { Storage } from '@remix-project/remix-lib'
import { joinPath } from './lib/helper'

/*
  Migrating the files to the BrowserFS storage instead or raw localstorage
*/
export default (fileProvider) => {
  const fileStorage = new Storage('sol:')
  const flag = 'status'
  const fileStorageBrowserFS = new Storage('remix_browserFS_migration:')
  if (fileStorageBrowserFS.get(flag) === 'done') return
  fileStorage.keys().forEach((path) => {
    if (path !== '.remix.config') {
      const content = fileStorage.get(path)
      fileProvider.set(path, content)
      // TODO https://github.com/ethereum/remix-ide/issues/2377
      // fileStorage.remove(path) we don't want to remove it as we are still supporting the old version
      console.log('file migrated', path)
    }
  })
  fileStorageBrowserFS.set(flag, 'done')
}

export async function migrateToWorkspace (fileManager) {
  const browserProvider = fileManager.getProvider('browser')
  const workspaceProvider = fileManager.getProvider('workspace')
  const flag = 'status'
  const fileStorageBrowserWorkspace = new Storage('remix_browserWorkspace_migration:')
  if (fileStorageBrowserWorkspace.get(flag) === 'done') return
  const files = await browserProvider.copyFolderToJson('/')
  console.log(files)
  const workspaceName = 'default_workspace'
  const workspacePath = joinPath('browser', workspaceProvider.workspacesPath, workspaceName)
  await fileManager.createWorkspace(workspaceName)
  await populateWorkspace(workspacePath, files, fileManager)
  fileStorageBrowserWorkspace.set(flag, 'done')
}

const populateWorkspace = async (workspace, json, fileManager) => {
  for (const item in json) {
    const isFolder = json[item].content === undefined
    if (isFolder) {
      await fileManager.mkdir(joinPath(workspace, item))
      await populateWorkspace(workspace, json[item].children, fileManager)
    } else {
      await fileManager.writeFile(joinPath(workspace, item), json[item].content)
    }
  }
}
