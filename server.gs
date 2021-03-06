// !important: must redeploy
// required: doPost trigger in spreadsheet on form submit 

function setJSONFile() {
  const filename = 'db.json.txt'
  const timestamp = new Date()
  
  // create some dummy data
  const obj = {}
  obj['init'] = {
    firstVisit: timestamp,
    latestVisit: timestamp,
    visits: 1,
    subIds: { ['init']: 1 }
  }
  const json = JSON.stringify(obj)
  
  // get the file
  const files = DriveApp.getFilesByName(filename)
  if (files.hasNext()) { return files.next().setContent(json) } // overwrite and set the contents of the file 
  else { return DriveApp.createFile(filename, json) } // create the file if it does not exist
}

function setTimeBasedTrigger() {
  return ScriptApp.newTrigger('setJSONFile')
  .timeBased()
  .atHour(1)
  .everyWeeks(1)
  .onWeekDay(ScriptApp.WeekDay.MONDAY)
  .inTimezone('America/Los_Angeles')
  .create()
}

function log(message) {
  const filename = 'log.txt'
  const timestamp = new Date()
  const log = `${timestamp}: ${message}`
  const files = DriveApp.getFilesByName(filename)
  if (files.hasNext()) { return files.next().setContent(log) }
  else { return DriveApp.createFile(filename, log) }
}
          
function getData() {
  const files = DriveApp.getFilesByName('db.json.txt')
  if (files.hasNext()) {
    const file = files.next()
    const json = file.getBlob().getDataAsString()
    const data = JSON.parse(json)
    return data
  }
}
          
function setData(obj) {
  const json = JSON.stringify(obj)
  const filename = 'db.json.txt'        
  const files = DriveApp.getFilesByName(filename)
  if (files.hasNext()) { return files.next().setContent(json) }
  else { return DriveApp.createFile(filename, json) }
}

// https://github.com/jamiewilson/form-to-google-sheets
function doGet(e) {
  const lock = LockService.getScriptLock()
  lock.tryLock(1000)
  try { 
       
    // get params 
    const { parameter: { id: fingerprintId, subId } } = e
    let hasTrash = false
    let hasLied = false
    let hasErrors = false
    
    //log(JSON.stringify(e.parameter))
    
    // try server feature
    try {
      hasTrash = e.parameter.hasTrash
      hasLied = e.parameter.hasLied
      hasErrors = e.parameter.hasErrors
    }
    catch (error) { }
         
    // get database
    const db = getData()
    
    // update or create data
    const timestamp = new Date()
    if (db[fingerprintId]) {
      // update
      const dbId = db[fingerprintId]
      const { subIds } = dbId
      if (subIds[subId]) { subIds[subId]++ }
      else { subIds[subId] = 1 }
      dbId.latestVisit = timestamp
      dbId.visits++
      dbId.subIds = subIds
      db[fingerprintId] = dbId
      
      if (('hasTrash' in dbId) && (''+dbId.hasTrash) == 'false' && (''+hasTrash) == 'true') {
        dbId.hasTrash = true
      }
      if (('hasLied' in dbId) && (''+dbId.hasLied) == 'false' && (''+hasLied) == 'true') {
        dbId.hasLied = true
      }
      if (('hasErrors' in dbId) && (''+dbId.hasErrors) == 'false' && (''+hasErrors) == 'true') {
        dbId.hasErrors = true
      }
      
    }
    else {
      // create
      db[fingerprintId] = {
        firstVisit: timestamp,
        latestVisit: timestamp,
        visits: 1,
        subIds: { [subId]: 1 },
        hasTrash,
        hasLied,
        hasErrors
      }
    }
    
    // set database
    setData(db)
    
    // get id data
    const idData = db[fingerprintId]
    
    //log('test')
    
    // return json
    const json = JSON.stringify(idData)
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON)
  }
  catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'error', 'error': JSON.stringify(err) }))
      .setMimeType(ContentService.MimeType.JSON)
  }
  finally {
    lock.releaseLock()
  }
}