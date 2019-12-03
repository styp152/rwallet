import _ from 'lodash';
import Parse from 'parse/react-native';
import AsyncStorage from '@react-native-community/async-storage';
import DeviceInfo from 'react-native-device-info';
import config from '../../config';

const parseConfig = config && config.parse;

// If we are unable to load config, it means the config file is moved. Throw error to indicate that.
if (_.isUndefined(parseConfig)) {
  throw new Error('Unable to find config for Parse init. Check config file path!');
}

Parse.initialize(parseConfig.appId, parseConfig.javascriptKey, parseConfig.masterKey);
Parse.serverURL = parseConfig.serverURL;
Parse.masterKey = parseConfig.masterKey;
Parse.setAsyncStorage(AsyncStorage);

/** Parse Class definition */
const ParseUser = Parse.User;

/**
 * ParseHelper is a helper class with static methods which wrap up Parse lib logic,
 * so that we don't need to reference ParseUser, ParseGlobal in other files
 */
class ParseHelper {
  static signUp(appId) {
    const user = new Parse.User();

    // Set appId as username and password.
    // No real password is needed because we only want to get access to Parse.User here to access related data
    user.set('username', appId);
    user.set('password', appId);
    user.set('deviceId', DeviceInfo.getUniqueID());

    // TODO: other information needed to be set here.
    console.log('parse.signup is called.');
    return user.signUp();
  }

  static signIn(appId) {
    console.log('parse.signin is called.', appId);
    return Parse.User.logIn(appId, appId);
  }

  /**
   * Use user.save() to send wallets to backend server for update.
   * This App doesn't do any comparison, just simply send wallets data
   * @param {ParseUser} user Parse User object retrieved from signInOrSignUp
   * @param {array} wallets A Json array generated by WalletManger.toJson()
   */
  static async uploadWallets(user, wallets) {
    if (user && user instanceof ParseUser) {
      user.set('wallets', wallets);
      await user.save();
    }
  }

  /**
   * Use user.save() to send settings to backend server for update;
   * to be called when user's settings has changed
   *
   * @param {ParseUser} user Parse User object retrieved from signInOrSignUp
   * @param {array} wallets A Json array generated by Settings.toJson()
   */
  static async uploadSettings(user, settings) {
    if (user && user instanceof ParseUser) {
      user.set('settings', [settings]);
      await user.save();
    }
  }

  static getTransactionsByAddress({ symbol, type, address }) {
    console.log(`ParseHelper::getTransactionsByAddress is called, symbol: ${symbol}, type: ${type}, address: ${address}`);
    return Parse.Cloud.run('getTransactionsByAddress', { symbol, type, address }).then((res) => {
      console.log(`ParseHelper::getTransactionsByAddress received, res: ${JSON.stringify(res)}`);
      return Promise.resolve(res);
    }, (err) => {
      console.log(err);
      return Promise.reject(err);
    });
  }

  /**
   *
   * @param {object} param
   * @param {string} param.symbol Symbol of token
   * @param {string} param.type type of blockchain, Mainnet or Testnet
   * @param {string} param.sender from address
   * @param {string} param.receiver to address
   * @param {string} param.value amount of token to send
   * @param {string} param.data data field
   */
  static createRawTransaction({
    symbol, type, sender, receiver, value, data,
  }) {
    console.log(`ParseHelper::createRawTransaction is called, symbol: ${symbol}, type: ${type}, sender: ${sender}, receiver: ${receiver}, value: ${value}, data: ${data}`);
    return Parse.Cloud.run('createRawTransaction', {
      symbol, type, sender, receiver, value, data,
    }).then((res) => {
      console.log(`ParseHelper::createRawTransaction received, res: ${JSON.stringify(res)}`);
      return Promise.resolve(res);
    }, (err) => {
      console.log(err);
      return Promise.reject(err);
    });
  }

  /**
   * Send a raw transaction to server
   * @param {*} name Blockchain name, e.g. Bitcoin or Rootstock
   * @param {*} hash 0xf8692...dead0a,
   * @param {*} type Mainnet or Testnet
   */
  static sendSignedTransaction(name, hash, type) {
    return Parse.Cloud.run('sendSignedTransaction', { name, hash, type });
  }

  static getServerInfo() {
    return Parse.Cloud.run('getServerInfo');
  }

  static getPrice({ symbols, currencies }) {
    return Parse.Cloud.run('getPrice', { symbols, currency: currencies });
  }

  /**
   * Transform Parse errors to errors defined by this app
   * @param {object}     err        Parse error from response
   * @returns {object}  error object defined by this app
   * @method handleError
   */
  static handleError(err) {
    const message = err.message || 'error.parse.default';

    switch (err.code) {
      case Parse.Error.INVALID_SESSION_TOKEN:
        return Parse.User.logOut();
        // Other Parse API errors that you want to explicitly handle
      default:
        break;
    }

    return { message };
  }

  /**
   * get balance of given addrArray which is array of addresses
   * @param {array} addrArray
   * @returns {array} collection of each given address information include balance,etc...
   */
  static async getBalanceByAddress(addrArray) {
    const Address = Parse.Object.extend('Address'); // 建立Address这个表的query
    const query = new Parse.Query(Address);
    query.containedIn('address', addrArray);
    // 实际运行query
    return query.find();
  }

  /**
   * Return an array of wallets with basic information such as wallet balance
   * @returns {array} Array of wallet object; empty array if nothing found
   */
  static async getWallets() {
    // Get current Parse.User
    const parseUser = Parse.User.current();

    if (_.isUndefined(parseUser) || _.isUndefined(parseUser.get('wallets'))) {
      return [];
    }

    const wallets = parseUser.get('wallets');

    // since User's wallet field is linked value, we need to call fetch to retrieve full information of wallets
    await wallets.fetch();

    const result = _.map(wallets, (parseWallet) => ({
      address: parseWallet.get('address'),
      symbol: parseWallet.get('symbol'),
      type: parseWallet.get('type'),
      balance: parseWallet.get('balance'),
      txCount: parseWallet.get('txCount'),
    }));

    return result;
  }
}

export default ParseHelper;