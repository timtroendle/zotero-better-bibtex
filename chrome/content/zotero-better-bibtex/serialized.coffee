Zotero.BetterBibTeX.serialized = new class
  constructor: ->
    @items = {}

  load: ->
    try
      serialized = Zotero.BetterBibTeX.createFile('serialized-items.json')
      if serialized.exists()
        @items = JSON.parse(Zotero.File.getContents(serialized))
        Zotero.debug("serialized.load: #{Object.keys(@items).length} items")
      else
        @items = {}
    catch e
      Zotero.debug("serialized.load failed: #{e}")
      @items = {}

    if @items.Zotero != ZOTERO_CONFIG.VERSION || Zotero.BetterBibTeX.version(@items.BetterBibTeX) != Zotero.BetterBibTeX.version(Zotero.BetterBibTeX.release)
      @reset()
    @items.Zotero = ZOTERO_CONFIG.VERSION
    @items.BetterBibTeX = Zotero.BetterBibTeX.release

  remove: (itemID) ->
    delete @items[parseInt(itemID)]

  reset: ->
    Zotero.debug("serialized.reset")
    @items = {}

  get: (item, options = {}) ->
    # no serialization for attachments when their data is exported
    if options.exportFileData && (options.attachmentID || item.isAttachment())
      item = Zotero.Items.get(item) if options.attachmentID
      return null unless item
      return @_attachmentToArray(item)

    switch
      # attachment ID
      when options.attachmentID
        itemID = parseInt(item)
        item = null

      # Zotero object
      when item.getField
        itemID = parseInt(item.itemID)

      # cached miss
      when item.itemType == 'cache-miss'
        return null

      # assume serialized object passed
      when item.itemType
        return item

      else
        itemID = parseInt(item.itemID)
        item = null

    # we may be called as a method on itemGetter
    items = Zotero.BetterBibTeX.serialized.items

    if !items[itemID]
      item ||= Zotero.Items.get(itemID)
      items[itemID] = (if item.isAttachment() then @_attachmentToArray(item) else @_itemToArray(item)) if item
      switch
        # the serialization yielded no object (why?), mark it as missing so we don't do this again
        when !items[itemID]
          items[itemID] = {itemType: 'cache-miss'}

        when items[itemID].itemType in ['note', 'attachment']
          items[itemID].attachmentIDs = []

        else
          items[itemID].attachmentIDs = item.getAttachments()

    return null if items[itemID].itemType == 'cache-miss'
    return items[itemID]

  save:
    try
      serialized = Zotero.BetterBibTeX.createFile('serialized-items.json')
      serialized.remove(false) if serialized.exists()
      Zotero.File.putContents(serialized, JSON.stringify(@items))
    catch e
      Zotero.debug("serialized.save failed: #{e}")

Zotero.BetterBibTeX.serialized._attachmentToArray = Zotero.Translate.ItemGetter::_attachmentToArray
Zotero.BetterBibTeX.serialized._itemToArray = Zotero.Translate.ItemGetter::_itemToArray
