function SaveNow(model, cascade)
{
  this.reset( model, cascade );
}

extend( Operation, SaveNow,
{

  cascading: Rekord.Cascade.Local,

  interrupts: false,

  type: 'SaveNow',

  run: function(db, model)
  {
    var key = model.$key();
    var local = model.$local;

    if ( db.cache === Rekord.Cache.All && key && local && this.canCascade() )
    {
      db.store.put( key, local, this.success(), this.failure() );
    }
    else
    {
      this.finish();
    }
  }

});
