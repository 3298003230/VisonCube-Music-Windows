const getUpdateSourceError = () => new Error('Update source is not configured')

export const getVersionInfo = async() => {
  throw getUpdateSourceError()
}
