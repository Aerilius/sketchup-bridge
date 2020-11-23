Bridge.call('call_a_callback', 42, 81)

Bridge.get('get_a_value', 171).then(
  function (result) {
    console.log('received result ' + result)
  },
  function (error) {
    console.log('received error ' + error)
  }
)
