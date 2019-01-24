'use babel';

const fs = require('fs');
const ospath = require('path');
const $ = require('jquery');

export default class AtomFinderView {

  constructor( model ) {
    this.model = model;
    this.resizeTimeout = null;

    // Create root element
    this.element = document.createElement('div');
    this.element.classList.add('atom-finder');

    this.contents = document.createElement('div');
    this.contents.classList.add('list-tree');

    this.element.appendChild( this.contents );

    this.$element = $( this.element );
    this.$contents = $( this.contents );
  }

  updateContent( path, data ) {
    var self = this;
    var dirs = [];
    var files = [];

    this.contents.innerHTML = "";
    this.contents.scrollTop = 0;

    if ( !data ) {
      this.contents.innerHTML = '<p>Nothing to display :S</p>';
    } else {

      for ( var i in data ) {
        var type = ( fs.statSync( path+data[i] ).isDirectory() ? "dir" : "file" );
        var link = document.createElement('a');
        var label = document.createElement('span');

        label.classList.add('label');
        label.textContent = data[i];

        link.appendChild( label );

        link.id = this.model.idPrefix + i;
        link.dataset.path = path+data[i];
        link.dataset.index = i;
        link.dataset.isFile = false;
        link.dataset.isDir = false;
        link.classList.add('icon');

        link.style.minWidth = this.model.gridSize + 'px';
        link.style.height = this.model.gridSize + 'px';
        link.style.margin = this.model.gridGutter + 'px';
        link.style.fontSize = (this.model.gridSize / 2) + 'px';

        if ( i == this.model.cursorPos ) {
          link.classList.add('cursor');
        }

        if ( type === "dir" ) {
          link.classList.add('icon-file-directory');
          link.dataset.isDir = true;
          dirs.push( link );
        } else {
          link.classList.add('icon-file-text');
          link.dataset.isFile = true;
          files.push( link );
        }

        this.contents.appendChild( link );
      }

      if ( dirs.length ) {

        for ( var d in dirs ) {

          dirs[d].addEventListener('click', function ( event ) {
            if ( event ) { event.preventDefault(); }
            self.model.cursorSet( parseInt( this.dataset.index ) );
          });

          dirs[d].addEventListener('dblclick', function ( event ) {
            if ( event ) { event.preventDefault(); }
            self.model.gotoPath( this.dataset.path + ospath.sep );
          });
        }
      }

      if ( files.length ) {

        for ( var f in files ) {

          files[f].addEventListener('click', function ( event ) {
            if ( event ) { event.preventDefault(); }
            self.model.cursorSet( parseInt( this.dataset.index ) );
          });

          files[f].addEventListener('dblclick', function ( event ) {
            if ( event ) { event.preventDefault(); }
            self.model.openFile( this.dataset.path );
          });

        }
      }
    }
  }

  openModal( type, callback ) {
    var self = this;
    var modal = document.createElement('div');

    this.$modal = $(modal);
    this.$modal.toggleClass('modal', true );

    switch ( type ) {
      default:
        this.$modal.html("this is a modal");
      break;
    }

    this.$element.append( this.$modal );

    this.$modal.on('click', function ( event ) {
      if ( event ) { event.preventDefault(); }
      callback.apply( self, [ 'test' ] )
      self.$modal.remove();
      self.$modal = null;
    });
  }

  updateCursor( index ) {
    var cursors = this.contents.querySelectorAll('.cursor');
    var cursor = this.contents.querySelector("#" + this.model.idPrefix + index );

    for ( var i = 0; i < cursors.length; i++ ) {
      cursors[i].className = cursors[i].className.replace("cursor", "");
    }

    cursor.classList.add('cursor');

    var pTop = Math.floor( this.contents.getBoundingClientRect().top );
    var pHeight = Math.floor( pTop + this.contents.getBoundingClientRect().height );
    var cTop = Math.floor( cursor.getBoundingClientRect().top - this.model.gridGutter );
    var cHeight = Math.floor( cursor.getBoundingClientRect().height + ( this.model.gridGutter * 2 ) );

    if ( cTop - pTop < 0 ) {
      this.contents.scrollTop -= Math.abs( cTop - pTop );
    } else if ( ( cTop + cHeight ) >= pHeight ) {
      this.contents.scrollTop += Math.abs( ( cTop - pHeight ) + cHeight );
    }
  }

  // Tear down any state and detach
  destroy() {
    this.element.remove();
  }
}
