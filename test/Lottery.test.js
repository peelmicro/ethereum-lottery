const assert = require('assert');
const ganache = require('ganache-cli'); // Local test network
const Web3 = require('Web3'); // It's in uppercase because it's a constructor

const provider = ganache.provider(); // ganache provider
const web3 = new Web3(provider); // Instance of Web3 using the ganache provider

const { interface, bytecode } = require('../compile') //ABI=interface for web3 -Ethereum code= bytecode

let accounts;
let lottery;

beforeEach(async () => {
  // Get a list of all accounts
  accounts = await web3.eth.getAccounts(); // eth - ethereum contracts ==> ganache creates 10 unlocked (it can be used) by default
  
  // Use one of those accounts to deploy
  // the contract
  lottery = await new web3.eth.Contract(JSON.parse(interface)) // Teaches web3 about what methods the contract has
    .deploy({ data: bytecode}) // Tells web3 that we want to deploy a copy of this contract: We don´t need to initialize the contract 
    .send({ from: accounts[0], gas: '1000000'}); // Instructs web3 to send out a transactions that creates this contract: We use the first account

  // This code is needed only because of beta release .26 of web3 has a bug
  lottery.setProvider(provider);
});

describe('Lottery', () => {
  it('deploys a contract', () => {
    assert.ok(lottery.options.address); // ok=it has a defined value
  });

  it('allow one account to enter', async () => {
    await lottery.methods.enter().send({ 
      from: accounts[0], 
      value: web3.utils.toWei('0.02', 'ether')
    });

    const players = await lottery.methods.getPlayers().call({
      from: accounts[0]
    });

    assert.equal(accounts[0], players[0]);
    assert.equal(1,players.length);
  });

  it('allow multiple accounts to enter', async () => {
    await lottery.methods.enter().send({ 
      from: accounts[0], 
      value: web3.utils.toWei('0.02', 'ether')
    });
    await lottery.methods.enter().send({ 
      from: accounts[1], 
      value: web3.utils.toWei('0.02', 'ether')
    });
    await lottery.methods.enter().send({ 
      from: accounts[2], 
      value: web3.utils.toWei('0.02', 'ether')
    });  
    const players = await lottery.methods.getPlayers().call({
      from: accounts[0]
    });

    assert.equal(accounts[0], players[0]);
    assert.equal(accounts[1], players[1]);
    assert.equal(accounts[2], players[2]);
    assert.equal(3,players.length);
  });

  it('requires a minimum amount of ether to enter', async () => {
    try {
      await lottery.methods.enter().send({ 
        from: accounts[0], 
        value: web3.utils.toWei('0.002', 'ether')
      });
    } catch (err) {
      assert(err);
      return;
    }
    assert(false);
  });
 
  it('only manager can call pickWinner', async () => {
    try {
      await lottery.methods.enter().send({ 
        from: accounts[0], 
        value: web3.utils.toWei('0.02', 'ether')
      });
      await lottery.methods.pickWinner().send({ 
        from: accounts[1]
      });
    } catch (err) {
      assert(err);
      return;
    }
    assert(false);
  });

  it('sends money to the winner and resets the players array', async () => {
    await lottery.methods.enter().send({ 
      from: accounts[0], 
      value: web3.utils.toWei('2', 'ether')
    });

    const initialBalance = await web3.eth.getBalance(accounts[0]);

    await lottery.methods.pickWinner().send({ 
      from: accounts[0]
    });

    const finalBalance = await web3.eth.getBalance(accounts[0]);
    const difference = finalBalance -initialBalance;
    assert(difference > web3.utils.toWei('1.9', 'ether')) // some gas has been used
    const players = await lottery.methods.getPlayers().call({
      from: accounts[0]
    });
    assert.equal(0,players.length);

  });


});
