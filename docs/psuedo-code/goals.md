### Goals

1. To display techniques in order to download from
  - remote git url - Most likely way for a client to send to a registry
  - torrent magnet uri - Most likely form of distribution
  - HTTP - Easiest form to distribute a file for most individuals
  - FTP - Arguably the most straight forward form to programatically distribute files
  - FileSystem - Installing a local directory
2. To organize the best form of package manager possible
  - Package Resolving is based off registries whom the user trusts
   - This enables competition which is arguably better
  - Decentralized immutable distribution
  - Repository/origin is available as well

### Downloading

- `var Downloader = require('./downloader')`
- `var downloader = new Downloader('download-directory');`
- `var tester = compareDirectory.bind(void 0, '/to/compare');`
- `var readableToHandle = require('./readable-to-handle');`
- `downloader.get(readableToHandle('http://url.com')).then(tester);`
- `downloader.get(readableToHandle('magnet://etc12345643134')).then(tester);`
- `downloader.get(readableToHandle('http://repo.com/something.git')).then(tester);`
- `downloader.get(readableToHandle('ftp://server.com')).then(tester);`
- `downloader.get(readableToHandle('/file/server')).then(tester);`
