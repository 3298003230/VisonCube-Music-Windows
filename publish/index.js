const syncVersionFile = require('./utils/updateChangeLog')

const run = async() => {
  const result = await syncVersionFile(process.argv.slice(2)[0])
  console.log(result.changed ? 'Release metadata updated.' : 'Release metadata is already up to date.')
}

void run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
