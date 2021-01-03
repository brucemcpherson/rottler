const test = require("ava");
const Rottler = require("../src/rottler");
const { ms } = Rottler;


test("init defaults", (t) => {
  const r = new Rottler();
  t.is(r.waitTime(), 0)
  t.is(r.available(), r.rate)
});

test("check uses register with default delay", (t) => {
  const r = new Rottler();
  r.use()  
  t.is(r.waitTime(), r.delay);
  t.is(r.available(), r.rate - 1);
  // should fail because we havent waited long enough
  t.throws(()=>r.use());
});

test("check uses register with zero  delay", (t) => {
  const r = new Rottler({
    delay: 0
  });
  r.use();
  t.is(r.waitTime(), r.delay);
  t.is(r.available(), r.rate - 1);
  // should not fail because we have no delay
  t.notThrows(() => r.use());
});

test("check delaythrottling", async (t) => {
  const r = new Rottler({
    delay: 5000,
  });
  // the first one should have no delay
  t.is(r.waitTime(), 0);
  t.is(r.available(), r.rate);
  // this one should not throw because there's no delay on the first
  t.notThrows(() => r.use());
  // this one should throw because theres a delay on subsequent
  t.throws(() => r.use());
  // should not fail because weve rottled, but a ms could have passed
  t.is(r.waitTime() >= r.delay - 1, true);
  await t.notThrowsAsync(() => r.rottle());
});

test("check multiple uses", async (t) => {
  const r = new Rottler({
    delay: 0,
    rate: 2,
    period: 2000
  });
  r.use();
  t.is(r.waitTime(), r.delay);
  t.is(r.available(), r.rate - 1);
  // should not fail because we have no delay
  t.notThrows(() => r.use());
  // should throw because there's nothing left
  t.throws(() => r.use());

  // shouldnt throw because it'll wait
  await t.notThrowsAsync(() => r.rottle());
  t.is(r.rate - r.available(), r.size() )

});

test("check throwing error", async (t) => {
  const r = new Rottler({
    delay: 0,
    rate: 2,
    period: 2000,
    throwError: false
  });
  r.use();
  // shouldn't throw because it's turned off
  t.notThrows(() => r.use());
  t.notThrows(() => r.use());
  // shouldnt throw because it'll wait
  await t.notThrowsAsync(() => r.rottle());
  t.is(r.rate - r.available(), r.size());
});

test("limit uses", async (t) => {
  const r = new Rottler({
    delay: 10,
    rate: 2,
    period: 1000
  });
  t.notThrows(() => r.use());
  // because of delay needed
  t.throws(() => r.use());
  await t.notThrowsAsync(() => r.rottle());
  await t.notThrowsAsync(() => r.rottle());
  await t.notThrowsAsync(() => r.rottle());
});

test("check on", async (t) => {
  const r = new Rottler({
    delay: 0,
    rate: 2,
    period: 1000,
    throwError: false
  });
  t.throws(() => r.on('rubbish', ()=>true));
  r.on('rate', () => { 
    t.is(r.waitTime() <= r.period, true);
  })
  r.on("delay", () => {
    t.is(r.waitTime(), r.delay)
  });
  t.notThrows(() => r.use());
  t.notThrows(() => r.use());
  t.notThrows(() => r.use());
  await t.notThrowsAsync(() => r.rottle());
  await t.notThrowsAsync(() => r.rottle());
  await t.notThrowsAsync(() => r.rottle());
});



test("check async loop", async (t) => {
  const rows = [1, 2, 3];
  const rot = new Rottler({
    delay: 1000,
  });
  const rowIterator = rot.rowIterator({ rows });

  for await (let result of rowIterator) {
    t.is(result.index, result.row - 1);
    t.deepEqual(result.rows, rows);
  }
});


test("check delaythrottling - async", async (t) => {
  const r = new Rottler({
    delay: 5000,
  });
  
  t.is(r.ms('seconds', 1), Rottler.ms("minutes",2) /120)

  // the first one should have no delay
  t.is(r.waitTime(), 0);
  t.is(r.available(), r.rate);
  // this one should not throw because there's no delay on the first
  await t.notThrowsAsync(() => r.useAsync());
  // this one should throw because theres a delay on subsequent

  await t.throwsAsync(() => r.useAsync());
  // should not fail because weve rottled, but a ms could have passed
  t.is(r.waitTime() >= r.delay - 100, true);
  await t.notThrowsAsync(() => r.rottle());
});

/*
this needs to be tested on apps script
test("check synch loop", async (t) => {
  const rows = [1, 2, 3];
  const rot = new Rottler({
    delay: 3000,
    // required for apps script which doesnt support for await of
    synch: true,
    // and we'll need simulate a blocking sleep like apps script
    sleep: Utilities.sleep
  });


  for (let row of rows) {
    await rot.rottle()
    t.is(rot.waitTime() >= rot.delay -2  , true)
  }
});
*/
