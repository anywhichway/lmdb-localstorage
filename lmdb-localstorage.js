const stringify = (_,value) => {
    if(typeof(value)==="symbol") return value.toString();
    return value;
}

const parse = (key,value) => {
    if(typeof(value)==="string") {
        const name = (value.match(/Symbol\((.*)\)/)||[])[1];
        if(name) return Symbol.for(name)
    }
    return value;
}

const commit = (transaction=[]) => {
    const previous = {}, keysAdded = [], keysRemoved = [];
    try {
        for(let item of transaction) {
            let [key,value,version,ifVersion,db] = item;
            const {database,state,keys,fullName,useVersions} = db;
            previous[fullName] ||= {};
            const skey = JSON.stringify(key,stringify),
                addKeys = state[skey]==null,
                entry = previous[fullName][skey] = {state,entry:database.getEntry(key)};
            if(value!=null) {
                if(useVersions) {
                    if(ifVersion && entry.version!==ifVersion) {
                        continue;
                    }
                    if(!version && entry.version) {
                        version = entry.version + 1;
                    }
                }
                if(!version) version = entry.version || 1;
            }
            state[skey] = { value, version };
            if(value==null) {
                keysRemoved.push([key,keys]);
                const index = findIndex(key,keys);
                if(index!=null) keys.splice(index,1);
            } else if(addKeys) {
                keysAdded.push([key,keys]); // getEntry above will have added key to keys and sorted if necessary
            }
            TRANSACTIONS.dirty[fullName] ||= {};
            TRANSACTIONS.dirty[fullName][skey] ||= state;
        }
    } catch(e) {
        Object.values(previous).forEach((database) => Object.entries(database).forEach(([key,value]) => value.state[key] = value.entry));
        keysAdded.forEach(([added,keys]) => {
            const index = findIndex(added,keys);
            if(index!=null) keys.splice(index,1);
        })
        keysRemoved.forEach(([removed,keys]) => {
            const index = insortIndex(removed,keys)
            if(index!=null) keys.splice(index,0,removed);
        })
        throw e;
    } finally {
        if(TRANSACTIONS.length===0) {
            Object.entries(TRANSACTIONS.dirty).forEach(([fullName,keys]) => {
                Object.entries(keys).forEach(([key,state]) => {
                    const entry = state[key];
                    if(entry.value===null) {
                        delete state[key];
                        localStorage.removeItem(fullName+":"+key);
                    } else {
                        localStorage.setItem(fullName+":"+key,JSON.stringify(entry));
                    }
                })
            })
            TRANSACTIONS.dirty = {};
        } else {
            commit(TRANSACTIONS.pop())
        }
    }
}

const sort = (a,b) => {
    let aWasPrimitive, bWasPrimitive;
    if(!Array.isArray(a)) {
        aWasPrimitive = true;
        a = [a];
    }
    if(!Array.isArray(b)) {
        bWasPrimitive = true;
        b = [b];
    }
    for(let i=0;i<a.length && i<b.length;i++) {
        if(a==null && b!==null) return -1;
        if(a!==null && b===null) return 1;
        const atype = typeof(a[i]),
            btype = typeof(b[i]);
        if(atype!==btype) { // boolean,number,string
            if(atype==="symbol") return -1;
            if(btype==="symbol" || atype>btype) return 1;
            return -1;
        }
        const avalue = atype==="symbol" ? a[i].toString() : a[i],
            bvalue = btype==="symbol" ? b[i].toString() : b[i];
        if(aWasPrimitive!==bWasPrimitive && bWasPrimitive) return 1;
        if(avalue===bvalue) continue;
        if(avalue>bvalue) return 1;
        return -1;
    }
    return a.length - b.length;
};

const insortIndex = (key,keys,forSearch) => {
    let aWasPrimitive;
    if(!Array.isArray(key)) {
        aWasPrimitive = true;
        key = [key];
    }
    for(let i=0;i<keys.length;i++) {
        let bWasPrimitive, otherKey = keys[i];
        if(!Array.isArray(otherKey)) {
            bWasPrimitive = true;
            otherKey = [otherKey];
        }
        if(otherKey.length===key.length && otherKey.every((value,i) => value===key[i])) {
            return forSearch ? i : undefined;
        }
        for(let j=0;j<key.length;j++) {
            const  atype = typeof(otherKey[j]),
                btype = typeof(key[j]),
                a = atype==="symbol" ? otherKey[j].toString() : otherKey[j],
                b = btype==="symbol" ? key[j].toString() : key[j];
            if(a==null && b!==null) continue;
            if(a!==null && b===null) {
                return forSearch ? i - 1 : i;
            }
            if(atype!==btype) {
                if(atype==="symbol") continue;
                if(btype==="symbol" || atype>btype) {
                    return forSearch ? i - 1 : i;
                }
                continue;
            }
            if(aWasPrimitive!==bWasPrimitive && aWasPrimitive) return i;
            if(a>b) {
                return forSearch ? i - 1 : i;
            }
        }
    }
    return keys.length;
}

const findIndex = (key,keys) => {
    let aWasPrimitive;
    if(!Array.isArray(key)) {
        aWasPrimitive = true;
        key = [key];
    }
    for(let i=0;i<keys.length;i++) {
        let otherWasPrimitive, otherKey = keys[i];
        if(!Array.isArray(otherKey)) {
            otherWasPrimitive = true;
            otherKey = [otherKey];
        }
        if(otherKey.length===key.length && otherKey.every((value,i) => value===key[i])) return i;
        for(let j=0;j<key.length;j++) {
            const a = otherKey[j],
                b = key[j],
                atype = typeof(a),
                btype = typeof(b);
            if(a==null && b!==null) continue
            if(a!==null && b===null) return;
            if(atype!==btype) {
                if(atype==="symbol") continue;
                if(btype==="symbol" || atype>btype) return;
                continue;
            }
            if(aWasPrimitive!==otherWasPrimitive && aWasPrimitive) return; // is this correct?
            if(a>b) return;
        }
    }
}

const conditionalVersion = (entry,version) => {
    if(version) entry.version = version;
    return entry;
}

const conditionalReverse = (array,reverse) => {
    if(reverse) return array.reverse();
    return array;
}

function reduce(item,reducers)  {
    let reducer;
    while(reducer = reducers.shift()) {
        const [type,f] = reducer,
            value = f(item);
        if(value && value.then) {
            value.then((value) => {
                if(type==="filter" && !value) return;
                reduce(value,reducers);
            })
            return;
        }
        if(type=="filter") {
            if(!value) return;
        } else if(type==="map") {
            item = value;
        }
    }
}

let TRANSACTION_LOCK;

let TRANSACTIONS = [];

const CHILDREN = [];

class LMDBLocalStorage {

    #keys = [];

    #lastVersion;

    #path;

    #fullName;

    #state = {};

    #transactionLock;

    #transactions = [];

    #useVersions;

    #currentTransaction() {
        return TRANSACTIONS[TRANSACTIONS.length-1];
    }

    constructor({name,path,useVersions}={}) {
        this.#path = path;
        this.#fullName = path + "/" + name;
        this.#state = Object.keys(localStorage).reduce((state,key) => {
            if(key.startsWith(this.#fullName +":")) {
                key = key.substring(key.indexOf(":")+1);
                state[key] = undefined;
                this.#keys.push(JSON.parse(key,parse));
            }
            return state;
        },{});
        this.#keys.sort(sort);
        TRANSACTIONS.dirty = {};
        this.#useVersions = useVersions;
    }

    async childTransaction(callback) {
        const transaction = this.#currentTransaction();
        if(transaction) {
            const lock = TRANSACTION_LOCK;
            TRANSACTION_LOCK = null;
            const value = await this.transaction(callback);
            TRANSACTION_LOCK =  lock;
            return value;
        }
        return this.transaction(callback);
    }

    async clearAsync() {
        return this.clearSync();
    }

    clearSync() {
        this.#state = {};
        TRANSACTIONS.splice(0,TRANSACTIONS.length);
        TRANSACTION_LOCK = null;
        this.#keys.forEach((key) => {
            key = typeof(key)==="symbol" ? key.toString() : JSON.stringify(key, stringify);
            localStorage.removeItem(this.#fullName+":"+key);
        })
        this.#keys = [];
    }

    async close() {
        return new Promise((resolve) => {
            let interval = setInterval(async () => {
                if(TRANSACTIONS.length===0) {
                    clearInterval(interval);
                    interval = null;
                    if(!CHILDREN.includes(this)) {
                        for(const child of CHILDREN) await child.close();
                    }
                    if(this.#path==null) {
                        this.#keys.forEach((key) => {
                            key = typeof(key)==="symbol" ? key.toString() : JSON.stringify(key, stringify);
                            localStorage.removeItem(this.#fullName+":"+key);
                        })
                    }
                    resolve();
                }
            },100)
        });
    }

    async commited() {
        if(this.#transactionLock) {
            return TRANSACTION_LOCK.then(() => {})
        }
        return Promise.resolve();
    }

    doesExist(key,valueOrVersion) {
        const entry = this.getEntry(key);
        if(!entry) return false;
        if(this.#useVersions) {
            return entry.version === valueOrVersion;
        }
        return entry.value === valueOrVersion
    }

    async drop() {
        await this.close();
        return this.clearSync();
    }

    dropSync() {
        this.#state = {};
        TRANSACTIONS.splice(0,TRANSACTIONS.length);
        TRANSACTION_LOCK = null;
        Object.keys(localStorage).forEach((key) => {
            if(key.startsWith(this.#fullName+":")) localStorage.removeItem(key);
        })
    }

    async flushed() {
        if(this.#transactionLock) {
            return TRANSACTION_LOCK.then(() => {})
        }
        return Promise.resolve();
    }

    get(key) {
        const entry = this.getEntry(key);
        this.#lastVersion = entry.version;
        return entry.value==null ? undefined : entry.value;
    }

    getEntry(key) {
        if(key==null) throw new TypeError(`key cannot be null or undefined`);
        const skey = JSON.stringify(key,stringify);
        if(this.#state[key] == null) {
            const index = insortIndex(key,this.#keys);
            if(index!=null) this.#keys.splice(index,0,key);
        }
        return this.#state[skey]!=undefined ? this.#state[skey] :  this.#state[skey] = JSON.parse(localStorage.getItem(this.#fullName + ":" + skey)||"{}");
    }

    getKeys({start,end,limit=Infinity,offset=0,reverse,versions,snapshot}={}) {
        const iterable = (function*() {
            start = start ? insortIndex(start,this.#keys,true) : 0;
            end = end ? insortIndex(end,this.#keys,true) : this.#keys.length;
            const keys = this.#keys.slice(start,end+1);
            for(const key of conditionalReverse(keys,reverse).slice(offset)) {
                if(limit--<=0) return;
                yield key;
            }
        }).call(this);
        iterable.forEach = (f) => {
            reducers.push(["forEach",f]);
            for(let item of iterable) {
                reduce(item,reducers,f);
            }
        }
        const reducers = []
        iterable.map = (f) => {
            reducers.push(["map",f]);
            return iterable;
        }
        iterable.filter = (f) => {
            reducers.push(["filter",f]);
            return iterable;
        }
        return iterable;
    }

    getRange({start,end,limit=Infinity,offset=0,reverse,versions,snapshot}={}) {
        const useVersions = this.#useVersions,
            iterable = (function*() {
                start = start ? insortIndex(start,this.#keys,true) : 0;
                end = end ? insortIndex(end,this.#keys,true) : this.#keys.length;
                const keys = this.#keys.slice(start,end+1);
                for(const key of conditionalReverse(keys,reverse).slice(offset)) {
                    if(limit--<=0) return;
                    const {value,version} = this.#state[JSON.stringify(key,stringify)];
                    yield conditionalVersion({key,value},useVersions && versions ? version : null);
                }
            }).call(this);
        iterable.forEach = (f) => {
            reducers.push(["forEach",f]);
            for(let item of iterable) {
                reduce(item,[...reducers]);
            }
        }
        const reducers = []
        iterable.map = (f) => {
            reducers.push(["map",f]);
            return iterable;
        }
        iterable.filter = (f) => {
            reducers.push(["filter",f]);
            return iterable;
        }
        return iterable;
    }

    getValues(key,{limit=Infinity,offset=0,reverse,snapshot}={}) {
        throw new Error("getValues is not supported")
    }

    getLastVersion() {
        return this.#lastVersion;
    }

    async ifNoExists(key,callback) {
        const entry = this.getEntry(key);
        if(entry.value==null) {
            await callback();
            return true;
        }
        return false;
    }

    async ifVersion(key,ifVersion,callback) {
        const entry = this.getEntry(key);
        if(entry.version===ifVersion) {
            await callback();
            return true;
        }
        return false;
    }

    openDB(name,options={}) {
        if(name && typeof(name)==="object") {
            options = {...name};
        } else {
            options.name = name;
        }
        options.path = this.#path;
        const db = new LMDBLocalStorage(options);
        CHILDREN.push(db);
        return db;
    }

    async put(key,value,version,ifVersion) {
        return this.putSync(key,value,version,ifVersion);
    }
    putSync(key,value,version,ifVersion) {
        if(key==null) throw new TypeError(`key cannot be null or undefined`);
        if(value===undefined) throw new TypeError(`value cannot be undefined`);
        const transaction = this.#currentTransaction(),
            db = {database:this,state:this.#state,keys:this.#keys,fullName:this.#fullName,useVersions:this.#useVersions};
        if(transaction) {
            transaction.push([key,value,version,ifVersion,db]);
        } else {
            return commit([[key,value,version,ifVersion,db]],TRANSACTIONS);
        }
        return true;
    }
    async remove(key,ifVersion) {
        return this.removeSync(key,ifVersion);
    }
    removeSync(key,ifVersion) {
        if(key==null) throw new TypeError(`key cannot be null or undefined`);
        const transaction = this.#currentTransaction(),
            db = {database:this,state:this.#state,keys:this.#keys,fullName:this.#fullName,useVersions:this.#useVersions};
        if(transaction) {
            transaction.push([key,null,null,ifVersion,db]);
        } else {
            return commit([[key,null,null,ifVersion,db]],TRANSACTIONS);
        }
        return true;
    }
    async transaction(callback) {
        const promise =  new Promise(async (resolve,reject) => {
            if(this.#transactionLock) {
                try {
                    awaitTRANSACTION_LOCK;
                } catch(e) {

                }
            }
            TRANSACTIONS.push([]);
            let value;
            try {
                value = await callback();
                if(value===ABORT) {
                    throw new Error("Transaction aborted")
                }
            } catch(e) {
                TRANSACTIONS.pop();
                TRANSACTION_LOCK = undefined;
                reject(e);
                return;
            }
            try {
                commit(TRANSACTIONS.pop(),TRANSACTIONS);
                resolve(value);
            } catch(e) {
                reject(e);
            }
        });
        TRANSACTION_LOCK = promise;
        return promise
            .finally(() => {
                TRANSACTION_LOCK = undefined;
            })
    }
    transactionSync(callback) {
        TRANSACTIONS.push([]);
        let value;
        try {
            value = callback();
            if(value===ABORT) throw new Error("Transaction aborted")
        } catch(e) {
            TRANSACTIONS.pop();
            throw e;
            return;
        }
        if(value && value.then) {
            return value.then((value) => {
                if(value===ABORT) {
                    TRANSACTIONS.pop();
                    throw new Error("Transaction aborted");
                }
                commit(TRANSACTIONS.pop(),TRANSACTIONS);
                return value;
            })
        }
        commit(TRANSACTIONS.pop(),TRANSACTIONS);
        return value;
    }
}
const open = (path=null,options={}) => {
    if(path && typeof(path)==="object") {
        options = {...path};
        options.path ||= null;
    } else {
        options.path = path;
    }
    options.name ||= null;
    return new LMDBLocalStorage(options);
}
const ABORT = Object.freeze({});

export {open, ABORT};