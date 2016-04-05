function RemoveRemote(model, cascade)
{
  this.reset( model, cascade );
}

extend( Operation, RemoveRemote,
{

  cascading: Neuro.Cascade.Remote,

  interrupts: true,

  type: 'RemoveRemote',

  run: function(db, model)
  {
    if ( this.notCascade( Neuro.Cascade.Rest ) )
    {
      this.liveRemove();

      model.$trigger( Model.Events.RemoteRemove, [model] );

      this.finish();
    }
    else
    {
      model.$status = Model.Status.RemovePending;

      db.rest.remove( model, this.success(), this.failure() );
    }
  },

  onSuccess: function(data)
  {
    this.finishRemove();
  },

  onFailure: function(response, status)
  {
    var model = this.model;
    var key = model.$key();

    if ( status === 404 || status === 410 )
    {
      Neuro.debug( Neuro.Debugs.REMOVE_MISSING, model, key );

      this.finishRemove();
    }
    else if ( status !== 0 )
    {
      Neuro.debug( Neuro.Debugs.REMOVE_ERROR, model, status, key, response );

      model.$trigger( Model.Events.RemoteRemoveFailure, [model, response] );
    }
    else
    {
      // Looks like we're offline!
      Neuro.checkNetworkStatus();

      // If we are offline, wait until we're online again to resume the delete
      if (!Neuro.online)
      {
        Neuro.once( Neuro.Events.Online, this.handleOnline, this );

        model.$trigger( Model.Events.RemoteRemoveOffline, [model, response] );
      }
      else
      {
        model.$trigger( Model.Events.RemoteRemoveFailure, [model, response] );
      }

      Neuro.debug( Neuro.Debugs.REMOVE_OFFLINE, model, response );
    }
  },

  finishRemove: function()
  {
    var db = this.db;
    var model = this.model;
    var key = model.$key();

    Neuro.debug( Neuro.Debugs.REMOVE_REMOTE, model, key );

    // Successfully removed!
    model.$status = Model.Status.Removed;

    // Successfully Removed!
    model.$trigger( Model.Events.RemoteRemove, [model] );

    // Remove from local storage now
    this.insertNext( RemoveNow );

    // Remove it live!
    this.liveRemove();

    // Remove the model reference for good!
    delete db.all[ key ];
  },

  liveRemove: function()
  {
    if ( this.canCascade( Neuro.Cascade.Live ) )
    {
      var db = this.db;
      var model = this.model;
      var key = model.$key();

      // Publish REMOVE
      Neuro.debug( Neuro.Debugs.REMOVE_PUBLISH, model, key );

      db.live.remove( model );
    }
  },

  handleOnline: function()
  {
    var model = this.model;

    Neuro.debug( Neuro.Debugs.REMOVE_RESUME, model );

    model.$addOperation( RemoveRemote );
  }

});