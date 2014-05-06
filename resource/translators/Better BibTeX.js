{
	"translatorID": "ca65189f-8815-4afe-8c8b-8c7c15f0edca",
	"label": "Better BibTeX",
	"creator": "Simon Kornblith, Richard Karnesky and Emiliano heyns",
	"target": "bib",
	"minVersion": "2.1.9",
	"maxVersion": "",
	"priority": 100,
  "configOptions": {
    "getCollections": "true"
  },
	"displayOptions": {
		"exportNotes": true,
		"exportFileData": false,
		"useJournalAbbreviation": false
	},
	"inRepository": true,
	"translatorType": 3,
	"browserSupport": "gcsv",
	"lastUpdated": "/*= timestamp =*/"
}

/*= include BibTeX.js =*/

var fieldMap = Dict({
  address:      {literal: 'place'},
  chapter:      {literal: 'section'},
  edition:      {literal: 'edition'},
  type:         'type',
  series:       {literal: 'series'},
  title:        {literal: 'title'},
  volume:       {literal: 'volume'},
  copyright:    {literal: 'rights'},
  isbn:         'ISBN',
  issn:         'ISSN',
  lccn:         'callNumber',
  shorttitle:   {literal: 'shortTitle'},
  url:          'url',
  doi:          'DOI',
  abstract:     'abstractNote',
  nationality:  'country',
  language:     'language',
  assignee:     'assignee'
});
var inputFieldMap = Dict({
  booktitle:    'publicationTitle',
  school:       'publisher',
  institution:  'publisher',
  publisher:    'publisher',
  issue:        'issue',
  location:     'place'
});

Config.typeMap.toBibTeX = Dict({
  book:             ['book', 'booklet', 'manual', 'proceedings'],
  bookSection:      ['incollection', 'inbook'],
  journalArticle:   [':article', ':misc'],
  magazineArticle:  'article',
  newspaperArticle: 'article',
  thesis:           ['phdthesis', 'mastersthesis'],
  manuscript:       'unpublished',
  patent:           'patent',
  conferencePaper:  ['inproceedings', 'conference'],
  report:           'techreport',
  letter:           'misc',
  interview:        'misc',
  film:             'misc',
  artwork:          'misc',
  webpage:          'misc'
});

function doExport() {
  //Zotero.write('% BibTeX export generated by Zotero '+Zotero.Utilities.getVersion());
  // to make sure the BOM gets ignored
  Zotero.write("\n");

  var first = true;
  CiteKeys.initialize().forEach(function(item) {
    Config.fieldsWritten = Dict({});
    //don't export standalone notes and attachments
    if (item.itemType == 'note' || item.itemType == 'attachment') return;

    // determine type
    var type = getBibTexType(item);

    if (!first) { Zotero.write(",\n\n"); }
    first = false;

    var bibtexData = CiteKeys.items.get(int2str(item.itemID));
    Zotero.write("\n\n");
    Zotero.write('% ' + Config.label + ': ' + (bibtexData.pinned ?  'pinned' : 'generated') + "\n");
    if (bibtexData.duplicates) {
      Zotero.write('% better-bibtex: ' + (bibtexData.pinned ?  'hard' : 'soft') + ' conflict');
      if (bibtexData.default && bibtexData.default != bibtexData.key) {
        Zotero.write(' with ' + bibtexData.default);
      }
      Zotero.write("\n");
    }

    Zotero.write('@'+type+'{'+bibtexData.key);

    writeFieldMap(item, fieldMap);

    if (item.reportNumber || item.issue || item.seriesNumber || item.patentNumber) {
      writeField('number', escape(item.reportNumber || item.issue || item.seriesNumber|| item.patentNumber));
    }

    if (item.accessDate){
      var accessYMD = item.accessDate.replace(/\s*\d+:\d+:\d+/, '');
      writeField('urldate', escape(accessYMD));
    }

    if (item.publicationTitle) {
      if (item.itemType == 'bookSection' || item.itemType == 'conferencePaper') {
        writeField('booktitle', escape(item.publicationTitle, {brace: true}));
      } else if (Config.useJournalAbbreviation && item.journalAbbreviation){
        writeField('journal', escape(item.journalAbbreviation, {brace: true}));
      } else {
        writeField('journal', escape(item.publicationTitle, {brace: true}));
      }
    }

    if (item.publisher) {
      if (item.itemType == 'thesis') {
        writeField('school', escape(item.publisher, {brace: true}));
      } else if (item.itemType =='report') {
        writeField('institution', escape(item.publisher, {brace: true}));
      } else {
        writeField('publisher', escape(item.publisher, {brace: true}));
      }
    }

    if (item.creators && item.creators.length) {
      // split creators into subcategories
      var authors = [];
      var editors = [];
      var translators = [];
      var collaborators = [];
      var primaryCreatorType = Zotero.Utilities.getCreatorsForType(item.itemType)[0];
      var creator;

      item.creators.forEach(function(creator) {
        if (('' + creator.firstName).trim() != '' && ('' + creator.lastName).trim() != '') {
          creatorString = creator.lastName + ', ' + creator.firstName;
        } else {
          creatorString = {literal: creator.lastName}
        }

        switch (creator.creatorType) {
          case 'editor':
          case 'seriesEditor':
            editors.push(creatorString);
            break;
          case 'translator':
            translators.push(creatorString);
          case primaryCreatorType:
            authors.push(creatorString);
            break;
          default:
            collaborators.push(creatorString);
        }
      });

      writeField('author', escape(authors, {sep: ' and '}));
      writeField('editor', escape(editors, {sep: ' and '}));
      writeField('translator', escape(translators, {sep: ' and '}));
      writeField('collaborator', escape(collaborators, {sep: ' and '}));
    }

    if (item.date) {
      var date = Zotero.Utilities.strToDate(item.date);
      if (typeof date.year === 'undefined') {
        writeField('year', escape({literal:item.date}));
      } else {
        // need to use non-localized abbreviation
        if (typeof date.month == 'number') {
          writeField('month', escape(months[date.month]), true); // no braces at all around the month
        }
        writeField('year', escape(date.year));
      }
    }

    writeExtra(item, 'note');

    writeField('keywords', escape(item.tags.map(function(tag) { return tag.tag; }), {sep: ', '}));

    writeField('pages', escape(item.pages));

    // Commented out, because we don't want a books number of pages in the BibTeX "pages" field for books.
    //if (item.numPages) {
    //  writeField('pages', escape(item.numPages));
    //}

    /* We'll prefer url over howpublished see
    https://forums.zotero.org/discussion/24554/bibtex-doubled-url/#Comment_157802

    if (item.itemType == 'webpage') {
      writeField('howpublished', item.url);
    }*/
    if (item.notes && Config.exportNotes) {
      item.notes.forEach(function(note) {
        writeField('annote', escape(Zotero.Utilities.unescapeHTML(note.note)));
      });
    }

    writeField('file', saveAttachments(item));

    flushEntry(item);

    Zotero.write("\n}");
  });

  exportJabRefGroups();
}

function createZoteroReference(bibtexitem) {
  var type = Zotero.Utilities.trimInternal(bibtexitem.get('__type__').toLowerCase());
  if (bibtexitem.has('type')) { type = Zotero.Utilities.trimInternal(bibtexitem.get('type').toLowerCase()); }
  type = Config.typeMap.toZotero.get(type) || 'journalArticle';

  trLog('creating reference for ' + JSON.stringify(bibtexitem));

  var item = new Zotero.Item(type);
  item.itemID = bibtexitem.get('__key__');

  var biblatexdata = [];
  bibtexitem.forEach(function(value, field) {
    if (['__key__', '__type__', 'type'].indexOf(field) >= 0) { return; }
    if (!value || Zotero.Utilities.trim(value) == '') { return; }

    if (fieldMap.has(field)) {
      zField = fieldMap.get(field);
      if (zField.literal) { zField = zField.literal; }
      item[zField] = value;

    } else if (inputFieldMap.has(field)) {
      zField = inputFieldMap.get(field);
      if (zField.literal) { zField = zField.literal; }
      item[zField] = value;

    } else if (field == 'journal') {
      if (item.publicationTitle) {
        item.journalAbbreviation = value;
      } else {
        item.publicationTitle = value;
      }

    } else if (field == 'fjournal') {
      if (item.publicationTitle) {
        // move publicationTitle to abbreviation
        item.journalAbbreviation = value;
      }
      item.publicationTitle = value;

    } else if (field == 'author' || field == 'editor' || field == 'translator') {
      value.split(/ and /i).map(function(name) { return name.trim(); }).filter(function(name) { return (name != ''); }).forEach(function(name) {
        var creator = {};
        var pieces = name.split(',');
        if (pieces.length > 1) {
          creator.firstName = pieces.pop().trim();
          creator.lastName = pieces.join(',').trim();
          creator.creatorType = field;
        } else {
          creator = Zotero.Utilities.cleanAuthor(name, field, false);
        }
        item.creators.push(creator);
      });

    } else if (field == 'institution' || field == 'organization') {
      item.backupPublisher = value;

    } else if (field == 'number'){ // fix for techreport
      if (item.itemType == 'report') {
        item.reportNumber = value;
      } else if (item.itemType == 'book' || item.itemType == 'bookSection') {
        item.seriesNumber = value;
      } else if (item.itemType == 'patent'){
        item.patentNumber = value;
      } else {
        item.issue = value;
      }

    } else if (field == 'month') {
      var monthIndex = months.indexOf(value.toLowerCase());
      if (monthIndex >= 0) {
        value = Zotero.Utilities.formatDate({month:monthIndex});
      } else {
        value += ' ';
      }
    
      if (item.date) {
        if (value.indexOf(item.date) >= 0) {
          // value contains year and more
          item.date = value;
        } else {
          item.date = value+item.date;
        }
      } else {
        item.date = value;
      }

    } else if (field == 'year') {
      if (item.date) {
        if (item.date.indexOf(value) < 0) {
          // date does not already contain year
          item.date += value;
        }
      } else {
        item.date = value;
      }

    } else if (field == 'date') {
      //We're going to assume that 'date' and the date parts don't occur together. If they do, we pick date, which should hold all.
      item.date = value;

    } else if (field == 'pages') {
      if (item.itemType == 'book' || item.itemType == 'thesis' || item.itemType == 'manuscript') {
        item.numPages = value;
      } else {
        item.pages = value.replace(/--/g, '-');
      }

    } else if (field == 'note') {
      item.extra += '\n'+value;

    } else if (field == 'howpublished') {
      if (value.length >= 7) {
        var str = value.substr(0, 7);
        if (str == 'http://' || str == 'https:/' || str == 'mailto:') {
          item.url = value;
        } else {
          item.extra += '\nPublished: '+value;
        }
      }

    //accept lastchecked or urldate for access date. These should never both occur. 
    //If they do we don't know which is better so we might as well just take the second one
    } else if (field == 'lastchecked'|| field == 'urldate'){
      item.accessDate = value;

    } else if (field == 'keywords' || field == 'keyword') {
      var kw = value.split(/[,;]/);
      if (kw.length == 1) {
        kw = value.split(/\s+/);
      }
      item.tags = kw.map(function(k) {
        return k.replace(/^[\s{]+|[}\s]+$/gm, '').trim();
      });

    } else if (field == 'comment' || field == 'annote' || field == 'review') {
      item.notes.push({note:Zotero.Utilities.text2html(value)});

    } else if (field == 'pdf' || field == 'path' /*Papers2 compatibility*/) {
      item.attachments = [{path:value, mimeType:'application/pdf'}];

    } else if (field == 'sentelink') { // the reference manager 'Sente' has a unique file scheme in exported BibTeX
      item.attachments = [{path:value.split(',')[0], mimeType:'application/pdf'}];

    } else if (field == 'file') {
      value.split(';').forEach(function(attachment) {
        attachment = attachment.split(':').map(function(att) { return att.trim(); });
        attachment = {title: attachment[0] == '' ? 'Attachment' : attachment[0], path: attachment[1], mimeType: attachment[2] };
        if (attachment.path != '') {
          if (attachment.mimeType && attachment.mimeType.match(/pdf/i)) {
            attachment.mimeType = 'application/pdf';
          } else {
            delete attachment.mimeType;
          }
          item.attachments.push(attachment);
        }
      });

    } else {
      biblatexdata.push(field.replace(/[=;]/g, '#') + '=' + value.replace(/[\r\n]+/g, ' ').replace(/[=;]g/, '#'));
    }
  });

  if (item.extra) {
    item.extra += "\n";
  } else {
    item.extra = '';
  }
  item.extra += 'bibtex: ' + item.itemID;

  if (biblatexdata.length > 0) {
    item.extra += "\nbiblatexdata[" + biblatexdata.join(';') + ']';
  }

  if (!item.publisher && item.backupPublisher){
    item.publisher=item.backupPublisher;
    delete item.backupPublisher;
  }
  item.complete();
}

/*= include import.js =*/

var exports = {
	'doExport': doExport,
	'doImport': doImport
}
