// 
// This file shows the minimum you need to provide to BookReader to display a book
//
// Copyright(c)2008-2009 Internet Archive. Software license AGPL version 3.

// Create the BookReader object
br = new BookReader();


// SU: Check and load if flipbook JSON is available, initialize bookreader app
$(function() {
  if ('undefined' !== typeof(flipbookJSON) && null != flipbookJSON && flipbookJSON.pages.length > 0) {
    br.dataJSON = flipbookJSON;
    br.initializeBookReader();   
    br.init();  
  }

  return;
});


// Return which side, left or right, that a given page should be displayed on
br.getPageSide = function(index) {
    if (0 == (index & 0x1)) {
        return 'R';
    } else {
        return 'L';
    }
}

// This function returns the left and right indices for the user-visible
// spread that contains the given index.  The return values may be
// null if there is no facing page or the index is invalid.
br.getSpreadIndices = function(pindex) {   
  var spreadIndices = [null, null]; 

  if ('rl' == this.pageProgression) {
    // Right to Left
    if (this.getPageSide(pindex) == 'R') {
      spreadIndices[1] = pindex;
      spreadIndices[0] = pindex + 1;
    } else {
      // Given index was LHS
      spreadIndices[0] = pindex;
      spreadIndices[1] = pindex - 1;
    }
  } else {
    // Left to right
    if (this.getPageSide(pindex) == 'L') {
      spreadIndices[0] = pindex;
      spreadIndices[1] = pindex + 1;
    } else {
      // Given index was RHS
      spreadIndices[1] = pindex;
      spreadIndices[0] = pindex - 1;
    }
  }
  
  return spreadIndices;
}

// For a given "accessible page index" return the page number in the book.
//
// For example, index 5 might correspond to "Page 1" if there is front matter such
// as a title page and table of contents.
br.getPageNum = function(index) {
  return index+1;
}

// Override the path used to find UI images
br.imagesBaseURL = 'images/';

br.getEmbedCode = function(frameWidth, frameHeight, viewParams) {
    return "Embed code not supported in bookreader demo.";
}

// Let's go!
// br.init(); // moved to document.ready() function

// read-aloud and search need backend compenents and are not supported in the demo
$('#BRtoolbar').find('.read').hide();
$('#textSrch').hide();
$('#btnSrch').hide();


// initialize bookreader - read pages' data and other info from the JSON file, 
// and add related functions to the bookreader object
//
br.initializeBookReader = function() {  
  this.bookTitle = "";
  this.bookUrl   = "";
  var newJSON = [];
  
  for (var index = 0; index < this.dataJSON.pages.length; index++ )  {
    if (this.dataJSON.pages[index].resourceType == "page") {
      newJSON.push(this.dataJSON.pages[index]);
    }
  }

  this.dataJSON.pages = newJSON;
  
  this.numLeafs = this.dataJSON.pages.length || 0;  

  // set title and URL for the book 
  if ('undefined' !== typeof this.dataJSON.bookTitle && null !== this.dataJSON.bookTitle) {
    this.bookTitle = this.dataJSON.bookTitle;
  }

  if ('undefined' !== typeof this.dataJSON.bookURL && null !== this.dataJSON.bookURL) {
    this.bookUrl = this.dataJSON.bookURL;
  }
    
  // Return the width of a given page.  Here we assume all images are 800 pixels wide
  br.getPageWidth = function(index) {
    if (index < 0) { index = 0; }

    if (typeof this.dataJSON.pages[index] === 'undefined' || index == this.numLeafs) {
      return 900;
    } 
        
    return parseInt(this.dataJSON.pages[index].width, 10);
  }
    
  // Return the height of a given page.  Here we assume all images are 1200 pixels high
  br.getPageHeight = function(index) {
    if (index < 0) { index = 0; }

    if (typeof this.dataJSON.pages[index] === 'undefined' || index == this.numLeafs) {
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
    var bestSize = "large";
    var bestLevel = 0;
    
    if (index < 0) { index = 0; }    

    bestLevel = this.getJp2LevelLargerThanContainer($(window).width(), $(window).height(), index);

    if (typeof this.dataJSON.pages[index].stacksSizes[bestLevel] !== 'undefined') {
      bestSize = this.dataJSON.pages[index].stacksSizes[bestLevel];
    }
        
    return this.dataJSON.pages[index]['stacksURL'] + '_' + bestSize;    
  }


  br.getThumbImgURI = function(index) {
    var lowestSize = "thumb";        
    return this.dataJSON.pages[index]['stacksURL'] + '_' + lowestSize;    
  } 


  br.getEmbedCode = function(frameWidth, frameHeight, viewParams) {
    return "Embed code not supported in bookreader demo.";
  }  
  
  // Return the max JP2 level of a given page
  br.getMaxJP2Level = function(index) {
    if (index < 0) { index = 0; }
    
    return parseInt(this.dataJSON.pages[index].levels, 10);
  }
   
  // Return the max JP2 width of a given page
  br.getMaxJP2Width = function(index) {
    if (index < 0) { index = 0; }
    
    return parseInt(this.dataJSON.pages[index].width, 10);
  }

  // Return the max JP2 height of a given page
  br.getMaxJP2Height = function(index) {
    if (index < 0) { index = 0; }
    
    return parseInt(this.dataJSON.pages[index].height, 10);
  }

  // clamp given level to between 0 and max JP2 level for a page
  br.clampJP2Level = function(index, level) {
    if (level < 0) { level = 0; }
    if (level > this.getMaxJP2Level(index)) { level = this.getMaxJP2Level(index); }
    return level;
  };

  // calculate level for a given container 
  br.getJp2LevelLargerThanContainer = function(ctWidth, ctHeight, index) {
    var jp2Levels = this.getMaxJP2Level(index);
    var maxJp2Dimension = Math.max(this.getMaxJP2Width(index), this.getMaxJP2Height(index));
    var minContainerDimension = Math.min(ctWidth, ctHeight);
    var ctLevel = 0;

    for (var level = jp2Levels; level >= 0; level--) {      
      if (minContainerDimension >= maxJp2Dimension) { ctLevel = level; break; }
      maxJp2Dimension = Math.round(maxJp2Dimension / 2);
    }

    ctLevel = this.clampJP2Level(index, ctLevel + 1); // one level larger than best fit
    return ctLevel;
  };
 
  // set SU stacks service sizes for each page    
  br.setStacksImgSizes = function() {
    for (var index = 0; index < this.dataJSON.pages.length; index++ )  {
      var maxLevel = this.getMaxJP2Level(index);
      
      this.dataJSON.pages[index].stacksSizes = {};      
      this.dataJSON.pages[index].stacksSizes[maxLevel] = 'full';            
      this.dataJSON.pages[index].stacksSizes[this.clampJP2Level(index, maxLevel - 1)] = 'xlarge';
      this.dataJSON.pages[index].stacksSizes[this.clampJP2Level(index, maxLevel - 2)] = 'large';
      this.dataJSON.pages[index].stacksSizes[this.clampJP2Level(index, maxLevel - 3)] = 'medium';
      this.dataJSON.pages[index].stacksSizes[this.clampJP2Level(index, maxLevel - 4)] = 'small';
    }      
  };  
   
  this.setStacksImgSizes();  
}

