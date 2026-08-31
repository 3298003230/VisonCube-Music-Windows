const fs = require('fs')
const { jp, sizeFormate } = require('./index')
const chalk = require('chalk')
const COS = require('cos-nodejs-sdk-v5')
const config = require('./cosConfig')
const MultiProgress = require('multi-progress')
const multi = new MultiProgress(process.stderr)

const cos = new COS({
  SecretId: config.secretId,
  SecretKey: config.secretKey,
  KeepAlive: false,
})

const getLocalFileList = () => fs.readdirSync(jp('../assets'), 'utf8')

const isReleaseAsset = fileName => fileName === 'latest.yml' || fileName === 'version.json' ||
  /\.(?:exe|blockmap)$/i.test(fileName)

const validateConfig = () => {
  const missing = ['secretId', 'secretKey', 'bucket', 'region', 'prefix']
    .filter(key => !config[key])
  if (missing.length) {
    throw new Error(`COS configuration is incomplete: ${missing.join(', ')} (set VISONCUBE_COS_* environment variables)`)
  }
}

const validateLocalFiles = files => {
  if (!files.includes('latest.yml')) throw new Error('Release assets must include latest.yml')
  if (!files.some(file => /\.exe$/i.test(file))) throw new Error('Release assets must include at least one .exe installer')
  const invalid = files.filter(file => !isReleaseAsset(file))
  if (invalid.length) throw new Error(`Refusing to upload non-release assets: ${invalid.join(', ')}`)
}

const createProgressBar = (name, spacekLen, total) => multi.newBar(
  `${`  ${name}`.padEnd(spacekLen, ' ')} :status [:bar] :current/:total  :percent  :speed`, {
    complete: '=',
    incomplete: ' ',
    width: 30,
    total,
  })


const uploadFile = (fileName, len) => new Promise((resolve, reject) => {
  const filePath = jp('../assets', fileName)
  // let size = fs.statSync(filePath).size
  let bar = null
  let prevLoaded = 0

  cos.sliceUploadFile({
    Bucket: config.bucket,
    Region: config.region,
    Key: config.prefix + fileName, /* 必须 */
    FilePath: filePath, /* 必须 */
    // TaskReady: function(taskId) { /* 非必须 */
    //   console.log(taskId)
    // },
    onHashProgress(progressData) { /* 非必须 */
      if (!bar) {
        bar = createProgressBar(fileName, len, progressData.total)
        prevLoaded = 0
      }
      bar.tick(progressData.loaded - prevLoaded, {
        status: '校验中',
        speed: sizeFormate(progressData.speed) + '/s',
      })
      prevLoaded = progressData.loaded
      // console.log('校验', fileName, JSON.stringify(progressData))
      // console.log('校验', JSON.stringify(progressData))
    },
    onProgress(progressData) { /* 非必须 */
      if (!bar) {
        bar = createProgressBar(fileName, len, progressData.total)
        prevLoaded = 0
      }
      bar.tick(progressData.loaded - prevLoaded, {
        status: '上传中',
        speed: sizeFormate(progressData.speed) + '/s',
      })
      prevLoaded = progressData.loaded
      // console.log('上传', fileName, JSON.stringify(progressData))
      // console.log('上传', JSON.stringify(progressData))
    },
  }, (err, data) => {
    if (err) {
      console.log(err)
      return reject(err)
    }
    bar.tick({
      status: '已完成',
      speed: '',
    })
    resolve(data)
  })
})


module.exports = async() => {
  validateConfig()
  const uploadFiles = getLocalFileList()
  validateLocalFiles(uploadFiles)
  console.log(chalk.blue('仅上传当前版本白名单产物，不删除COS历史文件'))
  if (uploadFiles.length) {
    console.log(chalk.blue('共需上传') + chalk.green(uploadFiles.length) + chalk.blue('个文件'))
    console.log(chalk.blue('正在上传新文件到COS...'))
    let max = Math.max(...uploadFiles.map(f => f.length)) + 2
    let tasks = uploadFiles.map(f => uploadFile(f, max))
    await Promise.all(tasks)
    console.log(''.padEnd(Math.max(2, tasks.length - 2), '\n'))
    console.log(chalk.green('所有文件上传完成'))
  } else {
    console.log(chalk.blue('没有需要上传的文件'))
  }
}
