# rottler - a rate limit helper

Working with rate limits can be hard, so the purpose of rottler is to provide no only a way of testing rate limit strategy, but also an helper to throttle calls according to a rate limit

## rate limits supported

Rottler supports
- a limited number of call per period
- a minimum delay between calls
- a combination of both


## installation

````
yarn add rottler
or
npm install rottler
````

## Usage

````
const rot = new Rottler (options)
````

## API testing

Let's say you are writing some code to run against an API which has rate limits. 

````
callApi()
  .then (result => handle(result))
  .catch(error => {
      if (error is a rate limit ) dosomemagic
  })
````

Instead of testing it against the real API, you can simulate the API response behavior with rottler.

Say the api limits to 10 calls per minute, with a minimum delay of 2 seconds between each call.

````
const rot = new Rottle ({
  period: 60 * 1000,
  rate: 10,
  delay: 2 * 1000
})

// simulate the the api behavior
try {
  rot.use()
} catch (error) {
  if (error is a rate limit ) {
    // this is how long you need to wait before trying again for a successful outcome
    console.log(rot.waitTime())
  }
}

````

or more likely, the API you are simulating will be async

````
  rot.useAsync()
    .catch (error=>{
      if (error is a rate limit ) {
        // this is how long you need to wait before trying again for a successful outcome
        console.log(rot.waitTime())
      }
    )
````

or you could see if it's going to fail before even trying

````
if (!rot.waitTime()) {
  rot.use()
}

````
or check how many you can still run in this period

````
if (!rot.available() > 0 ) {
  // good to go 
}

````
or see how many have been run in this period

````
console.log (rot.size())

````
## Alternatively, just let rottle handle your API calls

You can let just let rottle worry about waiting for the right time. This example will only run rot.use() when it knows it will fit inside the api rate limit parameters, and will wait for however long is necessary. 

````
  rot.rottle ().then (()=>rot.use())
````

### Applied to to api usage

Now we've seen how rot.use() simulates a rate limited API, but by mixing it into your app you can control when you call the api and forget all about rate limiting

````
  rot.rottle ()
    .then (()=>rot.useAsync())
    .then (()=>callApi())
    .then (result => handle(result))
    .catch(error => handle(error))

````


## events


If you need to customize behavior,  you can set listeners to be triggered when any exceptions happen

````
  rot.on('rate', ()=> {
    // just had to wait because of too many calls in the period
    // check how long to wait before trying agaim
    console.log(rot.waitTime())
  })
````

and

````
  rot.on('delay', ()=> {
    // just had to wait because we have to delay before retrying
    // check how long to wait before trying again
    console.log(rot.waitTime())
  })
````

In these cases, you might want to set options.throwError to false if you want to handle exceptions in some custom way

## options


These are the constructor options

| name | default | purpose |
| ---- | ---- | ---- |
| period | 60000 | period over which ratelimitis measured  in ms|
| rate | 10 | max no of calls in period |
| delay | 5 | minimum wait between calls |
| timeout | setTimeout | a funciton that needs to do the same as setTimeout |
| throwError | true |whether an attempt to trigger .use or .useAsync outside of rate throws an error |

## methods

All the options are accessible as class properties (eg rot.delay). Everything else is a method as below.

| method | returns | purpose |
| ---- | ---- | ---- |
| entry() | RottlerEntry | measurement stats |
| sinceLast() | number | how many ms since last successful .use |
| tooSoon() | boolean | whether it's too soon to try to .use |
| available() | number | how many .use are available in the current period (doesn't account for .delay) |
| waitTime() | number | how long to wait before a .use will be successful |
| reset() |  | start again and clear all measurements |
| rottle() | Promise  | resolves when waitTime() is zero |
| use() | RottlerEntry  | use 1 slot |
| useAsync() | Promise  | async version of use() |
| on(name: string, func: function) |   |  what to do when a rate or a delay event occurs|
| off(name: string, func: function) |   |  turn off listening to the selected event|

## convenience time conversion

Since there's a lot of conversions, a convenience ms to to other measures are provided as a static method, but also accessible from an instance. For example to get one day in ms
````
  rot.ms ('days')
````
or 10 hours in ms
````
  rot.ms ('hours', 10)
````
or can also be called as a static method
````
  Rottler.ms('weeks', 3)
````
To convert back the other way, just stick 'ms' in front of the conversion name. For example to convert 200000ms to weeks.
````
  rot.ms('msWeeks', 200000)
````
It's not rocket science, but it does help to document when instead of defining a simmer like this
````
const rot = new Rottle ({
  period: 60 * 1000,
  rate: 10,
  delay: 2 * 1000
})

````
You can do this
````
const ms = Rottle.ms
const rot = new Rottle ({
  period: ms('minute'),
  rate: 10,
  delay: ms('seconds', 2)
})
````
and you can interpret results like this
````
  const minutes = ms('msMinutes', rot.waitTime())
````

Here's the full list of conversions


| conversion name | returns |
| ---- |  ---- |
| seconds |  ms |
| minutes |  ms |
| hours |  ms |
| days |  ms |
| weeks |  ms |
| msSeconds |  seconds |
| msMinutes |  minutes |
| msHours |  hours |
| msDays |  days |
| msWeeks |  weeks |

## Quotas

Some schemes reset the counter at specific times, or allow the carrying forward of unused rate limits. However these are more about quotas (how many you can have) as opposed to rate limitations (how often you can have it), and are not supported by rottle at this time. If these or other pooled quota schemes is of interest, let me know in the issues section. We'd need to find a way to persist usage across sessions.

You can of course reset the counters during use with rot.reset() if necessary.

## Special Google Apps Script treatment


Server side Google Apps Script is not asynchronous. It doesn't even have a setTimeout function, but it does syntactically support Promises, so to make all this work all we have to do is to provide a setTimeout like function like this.


````
const ms = Rottle.ms
const rot = new Rottle ({
  period: ms('minute'),
  rate: 10,
  delay: ms('seconds', 2),
  timeout: (func , ms ) => {
    Utilities.sleep (ms)
    func ()
  }
})
````

Then we can use normal Apps Script functions with rate limiting being controlled by rottle. As below

````
  rot.rottle ()
    .then (()=>rot.useAsync())
    .then (()=>UrlFetchApp.fetch(url))
    .then (result => handle(result))
    .catch(error => handle(error))
````

but Apps Script probably is better suited to the aync/await style - like this

````
  await rot.rottle ()
  rot.use()
  try {
    const result = UrlFetchApp.fetch(url))
    handle(result)
  } catch (error) {
    handle(error)
  }
````