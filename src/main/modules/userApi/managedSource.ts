import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { MANAGED_USER_API_ID, MUSIC_SOURCE_MAX_SIZE } from '@common/musicSource'
import { getUserApis, removeManagedApi, upsertManagedApi } from './utils'

export interface ManagedSourceManifest {
  schema_version: number
  source_id: string
  name: string
  version: string
  revision: number
  content_url: string
  sha256: string
  max_size: number
  updated_at: string
}

const getCacheDir = () => path.join(global.lxDataPath, 'managed-source')
const getManifestPath = () => path.join(getCacheDir(), 'manifest.json')
const getSourcePath = () => path.join(getCacheDir(), 'source.js')
const getTempPath = () => path.join(getCacheDir(), 'source.tmp')
const getManifestTempPath = () => path.join(getCacheDir(), 'manifest.tmp')

const hash = (content: string) => crypto.createHash('sha256').update(content, 'utf8').digest('hex').toUpperCase()
const isScript = (script: string) => /^\/\*[\S|\s]+?\*\//.test(script)

const replaceFile = async(fromPath: string, toPath: string) => {
  await fs.promises.rm(toPath, { force: true })
  await fs.promises.rename(fromPath, toPath)
}

const validateManifest = (manifest: ManagedSourceManifest) => {
  if (manifest.schema_version !== 1 || !manifest.source_id || !manifest.name || !manifest.version || !manifest.sha256) {
    throw new Error('服务器返回的音源清单无效')
  }
  if (manifest.max_size <= 0 || manifest.max_size > MUSIC_SOURCE_MAX_SIZE) throw new Error('音源大小限制无效')
}

export const installManagedSource = async(params: { userId: number, manifest: ManagedSourceManifest, script: string }) => {
  const { userId, manifest, script } = params
  validateManifest(manifest)
  if (!isScript(script)) throw new Error('服务器返回的音源文件格式无效')
  if (Buffer.byteLength(script, 'utf8') > manifest.max_size) throw new Error('音源文件超过大小限制')
  if (hash(script) !== manifest.sha256.toUpperCase()) throw new Error('音源文件校验失败')

  await fs.promises.mkdir(getCacheDir(), { recursive: true })
  await fs.promises.writeFile(getTempPath(), script, 'utf8')
  await replaceFile(getTempPath(), getSourcePath())
  await fs.promises.writeFile(getManifestTempPath(), JSON.stringify({ ...manifest, user_id: userId }), 'utf8')
  await replaceFile(getManifestTempPath(), getManifestPath())
  await upsertManagedApi(script, manifest)
  return getUserApis()
}

export const hydrateManagedSource = async(userId: number) => {
  try {
    const manifest = JSON.parse(await fs.promises.readFile(getManifestPath(), 'utf8')) as ManagedSourceManifest & { user_id?: number }
    if (manifest.user_id !== userId) throw new Error('managed source belongs to another user')
    const script = await fs.promises.readFile(getSourcePath(), 'utf8')
    validateManifest(manifest)
    if (!isScript(script) || hash(script) !== manifest.sha256.toUpperCase()) throw new Error('cached source checksum mismatch')
    await upsertManagedApi(script, manifest)
    return true
  } catch {
    removeManagedApi()
    return false
  }
}

export { MANAGED_USER_API_ID }
