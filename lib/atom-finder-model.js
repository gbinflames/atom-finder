'use babel';

const fs = require('fs');
const exec = require('child_process').exec;
const ospath = require('path');

export default class AtomFinderModel {

  constructor( path ) {
    this.view = null;
    this.path = path;
    this.pathContents = [];
    this.cursors = [];
    this.cursorPos = 0;
    this.gridSize = 120;
    this.gridGutter = 10;
    this.fuzzyTimer = null;
    this.fuzzyTerm = null;
    this.hiddenFiles = false;
    this.idPrefix = "link_";
  }

  onResize( w, h ) {
    this.view.updateScrollHandle();
  }

  getTitle() {
    return "Atom Finder";
  }

  gotoPath( path = null, cursor = null ) {
    var self = this;

    if ( path ) { this.path = path; }

    this.path = ospath.normalize( this.path );

    fs.readdir( this.path, { withFileTypes: true }, function ( err, files ) {
      self.pathContents = [];

      for ( var i = 0; i < files.length; i++ ) {
        if ( !self.hiddenFiles ) {
          if ( require('hidefile').shouldBeHiddenSync( this.path + ospath.sep + files[i] ) ) {
            continue;
          }
        }

        // if ( !self.hiddenFiles && files[i].match(/^\..*$/) ) {
          // continue;
        // }

        self.pathContents.push( files[i] );
      }

      self.setCursorPos();

      if ( self.view ) {
        self.view.updateContent( self.path, self.pathContents );
      }
    });
  }

  getCommand( command, args = "" ) {
    var platform = require('os').platform();

    args = args !== "" ? " " + args : "";

    switch( command.toLowerCase().trim() ) {
      case "open":
        switch (platform) {
          case 'darwin': return "open" + args;
          case 'win32': return "start" + args;
          default: return "xdg-open" + args;
        }
      break;
    }

    return command + args;
  }

  openFile( path ) {
    exec( this.getCommand('open', path ) );
  }

  previewFile( path ) {
    exec( this.getCommand( 'qlmanage', '-p ' + path ) );
  }

  setCursorPos( pos = 0 ) {
    this.cursorPos = pos;
  }

  getCursorPos() {
    return this.cursorPos;
  }

  getCursorElement( index = null ) {
    if ( index === null ) {
      index = this.getCursorPos();
    }
    return this.view.element.querySelector( "#" + this.idPrefix + index );
  }

  isSameRow( elm1, elm2 ) {
    return ( elm1.getBoundingClientRect().top === elm2.getBoundingClientRect().top );
  }

  isSameCol( elm1, elm2 ) {
    return ( elm1.getBoundingClientRect().left === elm2.getBoundingClientRect().left );
  }

  handleKeys( event ) {

    switch ( event.code.toLowerCase() ) {
      case "arrowup":
        if ( event.metaKey ) {
          this.gotoPath( this.path + "../" );
        } else {
          this.moveCursorUp( event );
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
          this.moveCursorDown( event );
        }
      break;
      case "arrowleft":
        this.moveCursorLeft( event );
      break;
      case "arrowright":
        this.moveCursorRight( event );
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
          // this.view.enterState('goto');
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
          this.moveCursorTo( i );
          break;
        }
      }
    }
  }

  moveCursorTo( index ) {
    if ( index >= 0 && index < this.pathContents.length ) {
      this.setCursorPos( index );
      this.view.updateCursor( this.getCursorPos() );
    }
  }

  moveCursorUp( event ) {
    if ( event ) { event.preventDefault(); }

    var curr = this.getCursorElement();

    for ( var i = ( this.pathContents.length - 1 ); i >= 0; i-- ) {
      var tmp = this.getCursorElement( ( this.getCursorPos() + i ) % this.pathContents.length );

      if ( curr && tmp && ( !this.isSameRow( curr, tmp ) ) && this.isSameCol( curr, tmp ) ) {
        this.moveCursorTo( ( this.getCursorPos() + i ) % this.pathContents.length );
        break;
      }
    }
  }

  moveCursorDown( event ) {
    if ( event ) { event.preventDefault(); }

    var curr = this.getCursorElement();

    for ( var i = 0; i <= this.pathContents.length; i++ ) {
      var tmp = this.getCursorElement( ( this.getCursorPos() + i ) % this.pathContents.length );

      if ( curr && tmp && ( !this.isSameRow( curr, tmp ) ) && this.isSameCol( curr, tmp ) ) {
        this.moveCursorTo( ( this.getCursorPos() + i ) % this.pathContents.length );
        break;
      }
    }
  }

  moveCursorLeft( event ) {
    if ( event ) { event.preventDefault(); }

    var curr = this.getCursorElement();

    for ( var i = ( this.pathContents.length - 1 ); i >= 0; i-- ) {
      var tmp = this.getCursorElement( ( this.getCursorPos() + i ) % this.pathContents.length );

      if ( curr && tmp && this.isSameRow( curr, tmp ) && ( !this.isSameCol( curr, tmp ) ) ) {
        this.moveCursorTo( ( this.getCursorPos() + i ) % this.pathContents.length );
        break;
      }
    }
  }

  moveCursorRight( event ) {
    if ( event ) { event.preventDefault(); }

    var curr = this.getCursorElement();

    for ( var i = 0; i <= this.pathContents.length; i++ ) {
      var tmp = this.getCursorElement( ( this.getCursorPos() + i ) % this.pathContents.length );

      if ( curr && tmp && this.isSameRow( curr, tmp ) && ( !this.isSameCol( curr, tmp ) ) ) {
        this.moveCursorTo( ( this.getCursorPos() + i ) % this.pathContents.length );
        break;
      }
    }
  }

  destroy() {
    // nothing ?
  }
}
