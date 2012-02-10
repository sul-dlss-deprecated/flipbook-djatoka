// 
// This file shows the minimum you need to provide to BookReader to display a book
//
// Copyright(c)2008-2009 Internet Archive. Software license AGPL version 3.

// Create the BookReader object
var br = new BookReader();

$(document).ready(function() {  
  if (json !== null && json !== undefined && json.pages.length > 0) {
    br.dataJSON = json;
    br.initializeBookReader();
    br.init();
  }
  
  return;
});

br.initializeBookReader = function() {  
  this.bookTitle = "";
  this.bookUrl   = "";
  this.numLeafs = this.dataJSON.pages.length || 0;  

  if (this.dataJSON.title !== undefined && this.dataJSON.title !== null) {
    this.bookTitle = json.title;
  }

  if (this.dataJSON.url !== undefined && this.dataJSON.url !== null) {
    this.bookUrl = json.url;
  }

  
  // Return the width of a given page.  Here we assume all images are 800 pixels wide
  br.getPageWidth = function(index) {
    if (index < 0) { index = 0; }

    if (this.dataJSON.pages[index] === undefined || index == this.numLeafs) {  
      return 900;
    } 
    
    return parseInt(this.dataJSON.pages[index].width, 10);
  }
  
  // Return the height of a given page.  Here we assume all images are 1200 pixels high
  br.getPageHeight = function(index) {
    if (index < 0) { index = 0; }

    if (this.dataJSON.pages[index] === undefined || index == this.numLeafs) {  
      return 891;
    } 

    return parseInt(this.dataJSON.pages[index].height, 10);
  }  
  
  // We load the images from archive.org -- you can modify this function to retrieve images
  // using a different URL structure
  br.getPageURI = function(index, reduce, rotate) {
    // reduce and rotate are ignored in this simple implementation, but we
    // could e.g. look at reduce and load images from a different directory
    // or pass the information to an image server    
    if (index < 0) { index = 0; }

		if ('undefined' == typeof(rotate)) { rotate = 0; } 
		if ('undefined' == typeof(reduce)) { reduce = 0; } 

    var url = 'http://isis-dev.stanford.edu/adore-djatoka/resolver?url_ver=Z39.88-2004&rft_id=' + 
      escape(this.dataJSON.pages[index].identifier) + 
      '&svc_id=info:lanl-repo/svc/getRegion&svc_val_fmt=info:ofi/fmt:kev:mtx:jpeg2000&svc.format=image/jpeg&svc.level=' + reduce + '&svc.rotate=' + rotate;
    return url;    
  }

  br.getEmbedCode = function(frameWidth, frameHeight, viewParams) {
    return "Embed code not supported in bookreader demo.";
  }  
  
  // Return the max JP2 level of a given page
  br.getMaxJP2Level = function(index) {
    if (index < 0) { index = 0; }
    
    return parseInt(this.dataJSON.pages[index].levels, 10);
  }
  
}
