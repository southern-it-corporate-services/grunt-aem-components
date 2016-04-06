/*
 * grunt-aem-components
 *
 *
 * Copyright (c) 2015 Yong Qui Zheng
 * Licensed under the MIT license.
 *
 * Converting basic .erb file into a Adobe AEM component.
 */

'use strict';
var path = require('path');
var fs = require('fs');
var yamlParser = require('js-yaml');
var S = require('string');

/**
 *
 * @param path
 * @returns {boolean}
 */
function checkDirectoryExist(path){
  var exist =true;
  try{
    fs.lstatSync(path);

  }catch(e){
    exist=false;
  }
  return exist;
}

/**
 *
 * @param erbFile
 * @param componentPath
 * @param folderName
 * @param options
 */

function handleComponentsFiles(erbFile,componentPath,folderName,options){
  var yamlObj;
  try{
    fs.readFile(erbFile,function(err,data){
      if(err) throw err;
      fs.writeFileSync(componentPath+options.slash+folderName+options.punctuation+options.htmlExt,data,"utf8");//writing the html file
      var docStr = data.toString();
      if(S(docStr).startsWith("---")) {
        var result = docStr.split("---", 2);
        if(result.length>1){
          var yamlExp = result[1];
          yamlObj= yamlParser.safeLoad(yamlExp);
        }
      }
      var defaultFiles = fs.readdirSync(options.defaultsFileInclude);
      for(var i=0;i<defaultFiles.length;i++){
        var curFile=defaultFiles[i];
        if(curFile!=="." && curFile!==".." && curFile!==".DS_Store"){
          var writeData=fs.readFileSync(options.defaultsFileInclude+options.slash+curFile,"utf8");

          if(typeof yamlObj!=="undefined") {
            var useCollection =typeof yamlObj.collection!=="undefined"?true:false;
            writeData=yamlTokenizeReplace(yamlObj,options,writeData);
          }
          if(!useCollection && curFile.indexOf("dialog-coll.xml")!==-1){
            // we need to skip this because we do not need the collection dialog
            continue;
          }else if(useCollection && curFile.indexOf("dialog.xml")!==-1){
            continue;
          }
          if(curFile.indexOf("-coll.xml")!==-1){
            curFile= curFile.replace("-coll","");
          }
          fs.writeFileSync(componentPath+options.slash+curFile,writeData,'utf8');
        }
      }
    });
  }catch(e){
    throw e;
  }

}
/**
 *
 * @param yamlObj
 * @param options
 * @param writeData
 * @returns String of writable data to write to the component files
 */
function yamlTokenizeReplace(yamlObj,options,writeData){
  for (var j = 0; j < options.tokenizeMap.length; j++) {
    var singleToken = options.tokenizeMap[j];
    Object.keys(singleToken).forEach(function (key) {
      var yamlValue = yamlObj[singleToken[key]];
      if (typeof yamlValue !== "undefined") {
        var replaceable = options.tokenizeLeft + key + options.tokenizeRight;
        writeData = writeData.replace(replaceable, yamlValue);
      }
    });
  }
  return writeData;
}



module.exports = function (grunt) {

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('aem_components', 'Generate components base on .erb file', function () {

    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      punctuation: '.',
      slash:"/",
      defaultsFileInclude:"defaultInclude",
      htmlExt:"html",
      tokenizeMap:[],
      tokenizeLeft:"{",
      tokenizeRight:"}"
    });
    //enable async task to be run inside of grunt task
    var done = this.async();

    this.files.forEach(function(file){
      //grunt.log.writeln(path.basename(file.src));
      var src = file.src.filter(function(filepath){
        var fileName = path.basename(filepath);
        if(options.blackList.indexOf(fileName)===-1){
          // meaning this is not in the black list
          var folderName = fileName.substr(0,fileName.lastIndexOf(options.punctuation));
          if(typeof folderName!=="undefined" && folderName!==""){
            // make the directory
            var component = options.dest+options.slash+folderName;

            grunt.log.debug("Prepare component: "+component);
            //var exist = fs.existsSync(component);
            var exist = checkDirectoryExist(component);
            if(!exist){
              try{
                fs.mkdir(component,'0777',function(err){
                  if(err){
                    throw err;
                  }
                  handleComponentsFiles(filepath,component,folderName,options);
                  grunt.log.writeln("Component: "+folderName+" created");
                });// end of creating
              }catch(e){
                grunt.fail.warn(e);
              }
            }else{
              grunt.log.writeln("Component "+folderName+" wasn't created because it already exist!");
            }
          }
        }
      });
    });
  });
};
