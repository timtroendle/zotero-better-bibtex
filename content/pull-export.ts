declare const Zotero: any

const OK = 200
const SERVER_ERROR = 500
const NOT_FOUND = 404

import Translators = require('./translators.ts')

function displayOptions(request) {
  const isTrue = new Set([ 'y', 'yes', 'true' ])
  const query = request.query || {}

  return {
    exportCharset: query.exportCharset || 'utf8',
    exportNotes: isTrue.has(query.exportNotes),
    useJournalAbbreviation: isTrue.has(query.useJournalAbbreviation),
  }
}

function getTranslatorId(name) {
  for (const [id, translator] of Object.entries(Translators.byId)) {
    if (translator.label.replace(/\s/g, '').toLowerCase().replace('better', '') === name) return id
  }
  // allowed to pass GUID
  return name
}

Zotero.Server.Endpoints['/better-bibtex/collection'] = class {
  public supportedMethods = ['GET']

  public async init(request) {
    if (!request.query || !request.query['']) return [NOT_FOUND, 'text/plain', 'Could not export bibliography: no path']

    try {
      const [ , lib, path, translator ] = request.query[''].match(/\/(?:([0-9]+)\/)?(.*)\.([a-zA-Z]+)$/)

      const libID = parseInt(lib || 0) || Zotero.Libraries.userLibraryID

      let collection = Zotero.Collections.getByLibraryAndKey(libID, path)
      if (!collection) {
        for (const name of path.toLowerCase().split('/')) {
          if (!name) continue

          const collections = collection ? Zotero.Collections.getByParent(collection.id) : Zotero.Collections.getByLibrary(libID)
          for (const candidate of collections) {
            if (candidate.name.toLowerCase() === name) {
              collection = candidate
              break
            }
          }
          if (!collection) return [NOT_FOUND, 'text/plain', `Could not export bibliography: path '${path}' not found`]
        }
      }

      return [ OK, 'text/plain', await Translators.translate(getTranslatorId(translator), displayOptions(request), { collection }) ]

    } catch (err) {
      return [SERVER_ERROR, 'text/plain', '' + err]
    }
  }
}

Zotero.Server.Endpoints['/better-bibtex/library'] = class {
  public supportedMethods = ['GET']

  public async init(request) {
    if (!request.query || !request.query['']) return [NOT_FOUND, 'text/plain', 'Could not export library: no path']

    try {
      const [ , lib, translator ] = request.query[''].match(/\/?(?:([0-9]+)\/)?library\.([a-zA-Z]+)$/)
      const libID = parseInt(lib || 0) || Zotero.Libraries.userLibraryID

      if (!Zotero.Libraries.exists(libID)) {
        return [NOT_FOUND, 'text/plain', `Could not export bibliography: library '${request.query['']}' does not exist`]
      }

      return [OK, 'text/plain', await Translators.translate(getTranslatorId(translator), displayOptions(request), { library: libID }) ]

    } catch (err) {
      return [SERVER_ERROR, 'text/plain', '' + err]
    }
  }
}

Zotero.Server.Endpoints['/better-bibtex/select'] = class {
  public supportedMethods = ['GET']

  public async init(request) {
    const translator = request.query ? request.query[''] : null

    if (!translator) return [NOT_FOUND, 'text/plain', 'Could not export bibliography: no format' ]

    try {
      const items = Zotero.getActiveZoteroPane().getSelectedItems()
      if (!items.length) return [NOT_FOUND, 'text/plain', 'Could not export bibliography: no selection' ]

      return [OK, 'text/plain', await Translators.translate(getTranslatorId(translator), displayOptions(request), { items }) ]
    } catch (err) {
      return [SERVER_ERROR, 'text/plain', '' + err]
    }
  }
}
