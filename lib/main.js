'use babel';

import AtomFinderModel from './atom-finder-model';
import AtomFinderView from './atom-finder-view';
import { CompositeDisposable } from 'atom';

export default {

  subscriptions: null,

  activate() {
    this.subscriptions = new CompositeDisposable();

    // Add a protocol to init our view when atom.workspace.open([protocol://]) is called.
    this.subscriptions.add(
      atom.workspace.addOpener( function( uri ) {
        var match = uri.match(/^atom-finder:\/\/(.*)$/);
        if ( match ) {
          return new AtomFinderModel( match[1] );
        }
      })
    );

    // Add a view opener telling atom to render our view when a new model is created.
    this.subscriptions.add(
      atom.views.addViewProvider( AtomFinderModel, function ( model ) {
        model.view = new AtomFinderView( model );
        model.gotoPath();
        return model.view.element;
      })
    );

    // Register command that toggles this view
    this.subscriptions.add(
      atom.commands.add('atom-workspace', {
        'finder:new': function () {
          atom.workspace.open('atom-finder://' + require('os').homedir() + require('path').sep );
        }
      })
    );

    atom.workspace.element.addEventListener( 'keydown', this.KeyDownEventListener );
  },

  KeyDownEventListener( event ) {
    var active_pane_item = atom.workspace.getActivePaneItem();
    if ( active_pane_item && active_pane_item.constructor.name === "AtomFinderModel" ) {
      active_pane_item.handleKeys.apply( active_pane_item, [ event ] );
    }
  },

  deactivate() {
    atom.workspace.element.removeEventListener('keydown', this.KeyDownEventListener);
    this.subscriptions.dispose();
  }
};
