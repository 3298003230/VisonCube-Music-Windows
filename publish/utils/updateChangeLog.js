const fs = require('fs')
const path = require('path')

const packagePath = path.join(__dirname, '../../package.json')
const versionPath = path.join(__dirname, '../version.json')
const changeLogPath = path.join(__dirname, '../changeLog.md')

const parseVersionSections = (text) => {
  text = text.replace(/\r\n?/g, '\n')
  const matches = [...text.matchAll(/^##\s+(\d+\.\d+\.\d+)\s*$/gm)]
  return matches.map((match, index) => {
    const start = match.index
    const end = matches[index + 1]?.index ?? text.length
    return {
      version: match[1],
      markdown: text.slice(start, end).trim(),
      desc: text.slice(start + match[0].length, end)
        .replace(/(?:^|\n)#{1,6}\s+(.+)(?=\n|$)/g, '$1')
        .trim(),
    }
  })
}

const uniqueHistory = (items, currentVersion) => {
  const versions = new Set([currentVersion])
  return items.filter((item) => {
    if (!item?.version || versions.has(item.version)) return false
    versions.add(item.version)
    return true
  })
}

const syncVersionFile = async(expectedVersion) => {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  if (expectedVersion && expectedVersion !== pkg.version) {
    throw new Error(`Requested version ${expectedVersion} does not match package.json ${pkg.version}.`)
  }

  const versionInfo = JSON.parse(fs.readFileSync(versionPath, 'utf8'))
  const sections = parseVersionSections(fs.readFileSync(changeLogPath, 'utf8'))
  const current = sections.find(section => section.version === pkg.version)
  if (!current) throw new Error(`publish/changeLog.md does not contain version ${pkg.version}.`)

  const sectionHistory = sections
    .filter(section => section.version !== pkg.version)
    .map(({ version, desc }) => ({ version, desc }))
  const existingHistory = [
    { version: versionInfo.version, desc: versionInfo.desc },
    ...(Array.isArray(versionInfo.history) ? versionInfo.history : []),
  ]
  const nextVersionInfo = {
    ...versionInfo,
    version: pkg.version,
    desc: current.desc,
    history: uniqueHistory([...sectionHistory, ...existingHistory], pkg.version),
  }
  const nextContent = JSON.stringify(nextVersionInfo) + '\n'
  const changed = fs.readFileSync(versionPath, 'utf8') !== nextContent
  if (changed) fs.writeFileSync(versionPath, nextContent, 'utf8')

  return { changed, version: pkg.version }
}

module.exports = syncVersionFile
module.exports.parseVersionSections = parseVersionSections
