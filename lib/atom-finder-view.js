'use babel';

const fs = require('fs');
const ospath = require('path');
const $ = require('jquery');

export default class AtomFinderView {

  constructor( model ) {
    this.model = model;
    this.resizeTimeout = null;
    this.appClass = 'atom-finder';
    this.active = true;
    self.$prompt = null;

    // Create root element
    this.element = document.createElement('div');
    this.element.classList.add( this.appClass );
    this.element.classList.add('native-key-bindings');

    this.$element = $( this.element );

    this.$element.html(`
      <div class="list-tree"></div>
      <div class="af-path-bar">
        <span class="af-path-label">${require('os').homedir() + require('path').sep}</span>
      </div>
      <div class="af-scroll-bar">
        <div class="af-scroll-handle">
        </div>
      </div>
    `);

    this.$contents = this.$element.find('.list-tree');
    this.contents = this.$contents[0];

    this.$pathBar = this.$element.find('.af-path-bar');
    this.$pathBarLabel = this.$element.find('.af-path-label');
    this.$pathBarInput = this.$element.find('.af-path-input');

    this.width = this.$element.width();
    this.height = this.$element.height();

    this.$contents.on('scroll', this.updateScrollHandle.bind( this ) );

    window.requestAnimationFrame( this.tick.bind( this ) );
  }

  tick( tock ) {
    if ( this.active ) {

      if ( this.model ) {

        if ( typeof this.model['tick'] === "function" ) {
          this.model.tick.apply( this.model, [ tock ] );
        }

        if ( typeof this.model['onResize'] === "function" ) {

          if ( this.$element.width() !== this.width || this.$element.height() !== this.height ) {

            this.model.onResize.apply( this.model, [
              this.$element.width() - this.width,
              this.$element.height() - this.height
            ]);

            this.width = this.$element.width();
            this.height = this.$element.height();
          }
        }
      }

      window.requestAnimationFrame( this.tick.bind( this ) );
    }
  }

  updatePathBar() {
    this.$element.find('.af-path-label').html( this.model.path );
  }

  updateScrollHandle() {
    var ratio = Math.min( this.$contents.height() / this.contents.scrollHeight, 1 );
    this.$element.find('.af-scroll-handle').css({
      'height': (ratio * 100) + "%",
      'top': (ratio * this.contents.scrollTop) + "px"
    });
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

        if ( i == this.model.getCursorPos() ) {
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
            self.model.moveCursorTo( parseInt( this.dataset.index ) );
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
            self.model.moveCursorTo( parseInt( this.dataset.index ) );
          });

          files[f].addEventListener('dblclick', function ( event ) {
            if ( event ) { event.preventDefault(); }
            self.model.openFile( this.dataset.path );
          });

        }
      }
    }

    this.updatePathBar();
    this.updateScrollHandle();
  }

  createPrompt( text, callback = null ) {
    var self = this;

    if ( !callback ) {
      callback = text;
      text = null;
    }

    this.destroyPrompt();

    var handle = "input_"+(new Date().getTime())+"-"+Math.floor(Math.random() * 1000000);

    this.$prompt = $(`
      <form class="af-prompt native-key-bindings">
        ${text ? "<p>"+text+"</p>" : ""}
        <input id="${handle}" type="text">
      </form>
    `);

    this.$prompt.on('submit', function(event) {
      event.preventDefault();
      var input = self.$prompt.find('#'+handle ).val();
      callback.apply( self.model, [ input ]);
      self.destroyPrompt();
    });

    this.$element.toggleClass('waiting', true );
    this.$element.append( this.$prompt );

    this.$prompt.find('input').focus();
  }

  destroyPrompt() {
    if ( this.$prompt ) {
      this.$prompt.off('submit');
      this.$prompt.remove();
      this.$element.toggleClass('waiting', false );
      this.$prompt = null;
    }
    this.$element.focus();
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

    this.updateScrollHandle();
  }

  waiting() {
    return this.$element.hasClass('waiting');
  }

  // Tear down any state and detach
  destroy() {
    this.active = false;
    this.element.remove();
  }
}
