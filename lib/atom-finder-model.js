'use babel';

const fs = require('fs');
const exec = require('child_process').exec;
const ospath = require('path');

export default class AtomFinderModel {

  constructor( path ) {
    this.view = null;
    this.path = path;
    this.pathContents = [];
    this.cursorPos = 0;
    this.gridSize = 120;
    this.gridGutter = 10;
    this.fuzzyTimer = null;
    this.fuzzyTerm = null;
    this.hiddenFiles = false;
    this.idPrefix = "link_";
  }

  getTitle() { return "Atom Finder"; }

  gotoPath( path = null ) {
    var self = this;

    if ( path ) { this.path = path; }

    this.path = ospath.normalize( this.path );

    fs.readdir( this.path, { withFileTypes: true }, function ( err, files ) {
      self.pathContents = [];

      for ( var i = 0; i < files.length; i++ ) {
        if ( !self.hiddenFiles && files[i].match(/^\..*$/) ) {
          continue;
        }
        self.pathContents.push( files[i] );
      }

      // self.pathContents = files;
      self.cursorPos = 0;

      if ( self.view ) {
        self.view.updateContent( self.path, self.pathContents );
      }
    });
  }

  openFile( path ) {
    exec('open ' + path );
  }

  previewFile( path ) {
    exec('qlmanage -p ' + path );
  }

  getCursorElement( index = null ) {
    if ( index === null ) { index = this.cursorPos; }
    return this.view.element.querySelector( "#" + this.idPrefix + index );
  }

  isSameRow( elm1, elm2 ) {
    return ( elm1.getBoundingClientRect().top === elm2.getBoundingClientRect().top );
  }

  isSameCol( elm1, elm2 ) {
    return ( elm1.getBoundingClientRect().left === elm2.getBoundingClientRect().left );
  }

  handleKeys( event ) {
    // console.log( event );

    switch ( event.code.toLowerCase() ) {
      case "arrowup":
        if ( event.metaKey ) {
          this.gotoPath( this.path + "../" );
        } else {
          this.cursorUp( event );
        }
      break;
      case "arrowdown":
        if ( event.metaKey && event.shiftKey && this.pathContents.length ) {
          var cursorElement = this.getCursorElement();
          if ( cursorElement && cursorElement.dataset.isDir ) {
            atom.addToProject([cursorElement.dataset.path]);
          }
        } else if ( event.metaKey && this.pathContents.length ) {
          this.getCursorElement().dispatchEvent(
            new MouseEvent('dblclick', {
              'view': window,
              'bubbles': true,
              'cancelable': true
            })
          );
        } else {
          this.cursorDown( event );
        }
      break;
      case "arrowleft":
        this.cursorLeft( event );
      break;
      case "arrowright":
        this.cursorRight( event );
      break;
      case "space":
        var cursorElement = this.getCursorElement();
        if ( cursorElement && cursorElement.dataset.isFile ) {
          this.previewFile( cursorElement.dataset.path );
        }
      break;
      case "period":
        if ( event.metaKey && event.shiftKey ) {
          this.hiddenFiles = !this.hiddenFiles;
          this.gotoPath();
          break;
        }
      case "keyg":
        if ( event.metaKey && event.shiftKey ) {
          this.view.openModal('test', function ( input ) {
            console.log('modal test: ' + input );
          });
          break;
        }

      default:
        this.fuzzyfind( event );
      break;
    }
  }

  escapeRegExp( string ) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  fuzzyfind( event ) {
    if ( event ) { event.preventDefault(); }

    if ( event.key.length === 1 ) {
      var self = this;

      if ( this.fuzzyTimer ) { clearTimeout( this.fuzzyTimer ); }

      this.fuzzyTimer = setTimeout(function () {
        self.fuzzyTerm = null;
        self.fuzzyTimer = null;
      }, 1000 );

      this.fuzzyTerm = this.fuzzyTerm ? this.fuzzyTerm + event.key : event.key;

      var fuzzyRegEx = new RegExp( '^' + this.escapeRegExp( this.fuzzyTerm ) + '.*$', 'i' );

      for ( var i = 0; i < this.pathContents.length; i++ ) {
        if ( this.pathContents[i].match( fuzzyRegEx ) ) {
          this.cursorSet( i );
          break;
        }
      }
    }
  }

  cursorSet( index ) {
    if ( index >= 0 && index < this.pathContents.length ) {
      this.cursorPos = index;
      this.view.updateCursor( this.cursorPos );
    }
  }

  cursorUp( event ) {
    if ( event ) { event.preventDefault(); }

    var curr = this.getCursorElement();

    for ( var i = ( this.pathContents.length - 1 ); i >= 0; i-- ) {
      var tmp = this.getCursorElement( ( this.cursorPos + i ) % this.pathContents.length );

      if ( curr && tmp && ( !this.isSameRow( curr, tmp ) ) && this.isSameCol( curr, tmp ) ) {
        this.cursorSet( ( this.cursorPos + i ) % this.pathContents.length );

        // this.cursorPos = ( ( this.cursorPos + i ) % this.pathContents.length );
        // this.view.updateCursor( this.cursorPos );
        break;
      }
    }
  }

  cursorDown( event ) {
    if ( event ) { event.preventDefault(); }

    var curr = this.getCursorElement();

    for ( var i = 0; i <= this.pathContents.length; i++ ) {
      var tmp = this.getCursorElement( ( this.cursorPos + i ) % this.pathContents.length );

      if ( curr && tmp && ( !this.isSameRow( curr, tmp ) ) && this.isSameCol( curr, tmp ) ) {
        this.cursorSet( ( this.cursorPos + i ) % this.pathContents.length );
        // this.cursorPos = ( ( this.cursorPos + i ) % this.pathContents.length );
        // this.view.updateCursor( this.cursorPos );
        break;
      }
    }
  }

  cursorLeft( event ) {
    if ( event ) { event.preventDefault(); }

    var curr = this.getCursorElement();

    for ( var i = ( this.pathContents.length - 1 ); i >= 0; i-- ) {
      var tmp = this.getCursorElement( ( this.cursorPos + i ) % this.pathContents.length );

      if ( curr && tmp && this.isSameRow( curr, tmp ) && ( !this.isSameCol( curr, tmp ) ) ) {
        this.cursorSet( ( this.cursorPos + i ) % this.pathContents.length );
        // this.cursorPos = ( ( this.cursorPos + i ) % this.pathContents.length );
        // this.view.updateCursor( this.cursorPos );
        break;
      }
    }
  }

  cursorRight( event ) {
    if ( event ) { event.preventDefault(); }

    var curr = this.getCursorElement();

    for ( var i = 0; i <= this.pathContents.length; i++ ) {
      var tmp = this.getCursorElement( ( this.cursorPos + i ) % this.pathContents.length );

      if ( curr && tmp && this.isSameRow( curr, tmp ) && ( !this.isSameCol( curr, tmp ) ) ) {
        this.cursorSet( ( this.cursorPos + i ) % this.pathContents.length );
        // this.cursorPos = ( ( this.cursorPos + i ) % this.pathContents.length );
        // this.view.updateCursor( this.cursorPos );
        break;
      }
    }
  }
}
