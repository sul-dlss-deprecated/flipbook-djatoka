br = new BookReader();

br.titleLeaf = 5;

br.getPageWidth = function(index) {
    return this.pageW[index];
}

br.getPageHeight = function(index) {
    return this.pageH[index];
}

// Returns true if page image is available rotated
br.canRotatePage = function(index) {
    return 'jp2' == this.imageFormat; // Assume single format for now
}

// reduce defaults to 1 (no reduction)
// rotate defaults to 0 (no rotation)
br.getPageURI = function(index, reduce, rotate) {
    var _reduce;
    var _rotate;

    if ('undefined' == typeof(reduce)) {
        _reduce = 1;
    } else {
        _reduce = reduce;
    }
    if ('undefined' == typeof(rotate)) {
        _rotate = 0;
    } else {
        _rotate = rotate;
    }
    
    var file = this._getPageFile(index);
        
    // $$$ add more image stack formats here
    return 'http://'+this.server+'/BookReader/BookReaderImages.php?zip='+this.zip+'&file='+file+'&scale='+_reduce+'&rotate='+_rotate;
}

br._getPageFile = function(index) {
    var leafStr = '0000';
    var imgStr = this.leafMap[index].toString();
    var re = new RegExp("0{"+imgStr.length+"}$");
    
    var insideZipPrefix = this.subPrefix.match('[^/]+$');
    var file = insideZipPrefix + '_' + this.imageFormat + '/' + insideZipPrefix + '_' + leafStr.replace(re, imgStr) + '.' + this.imageFormat;
    
    return file;
}

br.getPageSide = function(index) {
    //assume the book starts with a cover (right-hand leaf)
    //we should really get handside from scandata.xml
    
        
    // $$$ we should get this from scandata instead of assuming the accessible
    //     leafs are contiguous
    if ('rl' != this.pageProgression) {
        // If pageProgression is not set RTL we assume it is LTR
        if (0 == (index & 0x1)) {
            // Even-numbered page
            return 'R';
        } else {
            // Odd-numbered page
            return 'L';
        }
    } else {
        // RTL
        if (0 == (index & 0x1)) {
            return 'L';
        } else {
            return 'R';
        }
    }
}

br.getPageNum = function(index) {
    var pageNum = this.pageNums[index];
    if (pageNum) {
        return pageNum;
    } else {
        return 'n' + index;
    }
}

// Single images in the Internet Archive scandata.xml metadata are (somewhat incorrectly)
// given a "leaf" number.  Some of these images from the scanning process should not
// be displayed in the BookReader (for example colour calibration cards).  Since some
// of the scanned images will not be displayed in the BookReader (those marked with
// addToAccessFormats false in the scandata.xml) leaf numbers and BookReader page
// indexes are generally not the same.  This function returns the BookReader page
// index given a scanned leaf number.
//
// This function is used, for example, to map between search results (that use the
// leaf numbers) and the displayed pages in the BookReader.
br.leafNumToIndex = function(leafNum) {
    for (var index = 0; index < this.leafMap.length; index++) {
        if (this.leafMap[index] == leafNum) {
            return index;
        }
    }
    
    return null;
}

// This function returns the left and right indices for the user-visible
// spread that contains the given index.  The return values may be
// null if there is no facing page or the index is invalid.
br.getSpreadIndices = function(pindex) {
    // $$$ we could make a separate function for the RTL case and
    //      only bind it if necessary instead of always checking
    // $$$ we currently assume there are no gaps
    
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
    
    //console.log("   index %d mapped to spread %d,%d", pindex, spreadIndices[0], spreadIndices[1]);
    
    return spreadIndices;
}

// Remove the page number assertions for all but the highest index page with
// a given assertion.  Ensures there is only a single page "{pagenum}"
// e.g. the last page asserted as page 5 retains that assertion.
br.uniquifyPageNums = function() {
    var seen = {};
    
    for (var i = br.pageNums.length - 1; i--; i >= 0) {
        var pageNum = br.pageNums[i];
        if ( !seen[pageNum] ) {
            seen[pageNum] = true;
        } else {
            br.pageNums[i] = null;
        }
    }

}

br.cleanupMetadata = function() {
    br.uniquifyPageNums();
}

// getEmbedURL
//________
// Returns a URL for an embedded version of the current book
br.getEmbedURL = function(viewParams) {
    // We could generate a URL hash fragment here but for now we just leave at defaults
    var url = 'http://' + window.location.host + '/stream/'+this.bookId;
    if (this.subPrefix != this.bookId) { // Only include if needed
        url += '/' + this.subPrefix;
    }
    url += '?ui=embed';
    if (typeof(viewParams) != 'undefined') {
        url += '#' + this.fragmentFromParams(viewParams);
    }
    return url;
}

// getEmbedCode
//________
// Returns the embed code HTML fragment suitable for copy and paste
br.getEmbedCode = function(frameWidth, frameHeight, viewParams) {
    return "<iframe src='" + this.getEmbedURL(viewParams) + "' width='" + frameWidth + "' height='" + frameHeight + "' frameborder='0' ></iframe>";
}

// getOpenLibraryRecord
br.getOpenLibraryRecord = function(callback) {
    // Try looking up by ocaid first, then by source_record
    
    var self = this; // closure
    
    var jsonURL = self.olHost + '/query.json?type=/type/edition&*=&ocaid=' + self.bookId;
    $.ajax({
        url: jsonURL,
        success: function(data) {
            if (data && data.length > 0) {
                callback(self, data[0]);
            } else {
                // try sourceid
                jsonURL = self.olHost + '/query.json?type=/type/edition&*=&source_records=ia:' + self.bookId;
                $.ajax({
                    url: jsonURL,
                    success: function(data) {
                        if (data && data.length > 0) {
                            callback(self, data[0]);
                        }
                    },
                    dataType: 'jsonp'
                });
            }
        },
        dataType: 'jsonp'
    });
}

br.buildInfoDiv = function(jInfoDiv) {
    // $$$ it might make more sense to have a URL on openlibrary.org that returns this info

    var escapedTitle = BookReader.util.escapeHTML(this.bookTitle);
    var domainRe = /(\w+\.(com|org))/;
    var domainMatch = domainRe.exec(this.bookUrl);
    var domain = this.bookUrl;
    if (domainMatch) {
        domain = domainMatch[1];
    }
       
    // $$$ cover looks weird before it loads
    jInfoDiv.find('.BRfloatCover').append([
                    '<div style="height: 140px; min-width: 80px; padding: 0; margin: 0;"><a href="', this.bookUrl, '"><img src="http://www.archive.org/download/', this.bookId, '/page/cover_t.jpg" alt="' + escapedTitle + '" height="140px" /></a></div>'].join('')
    );

    jInfoDiv.find('.BRfloatMeta').append([
                    // $$$ description
                    //'<p>Published ', this.bookPublished,
                    //, <a href="Open Library Publisher Page">Publisher name</a>',
                    //'</p>',
                    //'<p>Written in <a href="Open Library Language page">Language</a></p>',
                    '<h3>Other Formats</h3>',
                    '<ul class="links">',
                        '<li><a href="http://www.archive.org/download/', this.bookId, '/', this.subPrefix, '.pdf">PDF</a><span>|</span></li>',
                        '<li><a href="http://www.archive.org/download/', this.bookId, '/', this.subPrefix, '_djvu.txt">Plain Text</a><span>|</span></li>',
                        '<li><a href="http://www.archive.org/download/', this.bookId, '/', this.subPrefix, '_daisy.zip">DAISY</a><span>|</span></li>',
                        '<li><a href="http://www.archive.org/download/', this.bookId, '/', this.subPrefix, '.epub">ePub</a><span>|</span></li>',
                        '<li><a href="https://www.amazon.com/gp/digital/fiona/web-to-kindle?clientid=IA&itemid=', this.bookId, '&docid=', this.subPrefix, '">Send to Kindle</a></li>',
                    '</ul>',
                    '<p class="moreInfo"><span></span>More information on <a href="'+ this.bookUrl + '">' + domain + '</a>  </p>'].join('\n'));
                    
    jInfoDiv.find('.BRfloatFoot').append([
                '<span>|</span>',                
                '<a href="http://openlibrary.org/contact" class="problem">Report a problem</a>',
    ].join('\n'));
                
    if (domain == 'archive.org') {
        jInfoDiv.find('.BRfloatMeta p.moreInfo span').css(
            {'background': 'url(http://www.archive.org/favicon.ico) no-repeat', 'width': 22, 'height': 18 }
        );
    }
    
    jInfoDiv.find('.BRfloatTitle a').attr({'href': this.bookUrl, 'alt': this.bookTitle}).text(this.bookTitle);
    var bookPath = (window.location + '').replace('#','%23');
    jInfoDiv.find('a.problem').attr('href','http://openlibrary.org/contact?path=' + bookPath);

}

br.pageW =  [
            2768.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2484.0,2758.0            ];

br.pageH =  [
            3396.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3140.0,3414.0            ];
br.leafMap = [
            1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64    
            ];

br.pageNums = [
            null,null,null,null,null,null,null,null,null,null,null,null,'9','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40','41','42','43','44','45','46','47','48','49','50','51','52','53','54','55','56',null,null,null,null    
            ];
            
      
br.numLeafs = br.pageW.length;

br.bookId   = 'abroadcranethoma00craniala';
br.zip      = '/14/items/abroadcranethoma00craniala/abroadcranethoma00craniala_jp2.zip';
br.subPrefix = 'abroadcranethoma00craniala';
br.server   = 'ia700302.us.archive.org';
br.bookTitle= 'Abroad';
br.bookPath = '/14/items/abroadcranethoma00craniala/abroadcranethoma00craniala';
br.bookUrl  = 'http://www.archive.org/details/abroadcranethoma00craniala';
br.imageFormat = 'jp2';
br.archiveFormat = 'zip';

br.pageProgression = 'lr';
br.olHost = 'http://openlibrary.org'
br.olAuth = false;

// Check for config object
// $$$ change this to use the newer params object
if (typeof(brConfig) != 'undefined') {
    if (typeof(brConfig["ui"]) != 'undefined') {
        br.ui = brConfig["ui"];
    }

    if (brConfig['mode'] == 1) {
        br.mode = 1;
        if (typeof(brConfig['reduce'] != 'undefined')) {
            br.reduce = brConfig['reduce'];
        }
    } else if (brConfig['mode'] == 2) {
        br.mode = 2;      
    }
    
    if (typeof(brConfig["isAdmin"]) != 'undefined') {
        br.isAdmin = brConfig["isAdmin"];
    } else {
        br.isAdmin = false;
    }
} // brConfig



br.cleanupMetadata();
br.init();



