const Git = require('nodegit');
const { GraphQLString,
        GraphQLBoolean,
        GraphQLList,
        GraphQLInterfaceType,
        GraphQLObjectType } = require('graphql');

const objectType = new GraphQLInterfaceType({
  name: 'Object',
  fields: {
    oid: { type: GraphQLString },
  },
  resolveType(obj) {
    switch (obj.constructor) {
      // TODO blob, tag, tree
      case Git.Commit:
        return commitType;
      default:
        throw new Error('Unknown object');
    }
  },
});

const signatureType = new GraphQLObjectType({
  name: 'Signature',
  fields: {
    name: { type: GraphQLString },
    email: { type: GraphQLString },
  },
});

const commitType = new GraphQLObjectType({
  name: 'Commit',
  interfaces: [objectType],
  fields() {
    return {
      oid: {
        type: GraphQLString,
        resolve(commit) {
          return commit.id();
        },
      },
      message: { type: GraphQLString },
      summary: { type: GraphQLString },
      author: { type: signatureType },
      committer: { type: signatureType },
      parents: {
        type: new GraphQLList(commitType),
        resolve(commit) {
          return commit.getParents();
        },
      },
    };
  },
});

function resolveOid(repo, oid) {
  return Git.Object.lookup(repo, oid, Git.Object.TYPE.ANY).then((obj) => {
    switch (obj.type()) {
      // TODO: blob, tag, tree
      case Git.Object.TYPE.COMMIT:
        return repo.getCommit(oid);
      default:
        throw new Error(`Unexpected object type ${obj.type()}`);
    }
  });
}

const referenceType = new GraphQLObjectType({
  name: 'Reference',
  fields: {
    name: {
      type: GraphQLString,
      resolve(reference) {
        return reference.toString();
      },
    },
    target: {
      type: objectType,
      resolve(reference) {
        const repo = reference.owner();
        const oid = reference.target();
        return resolveOid(repo, oid);
      },
    },
  },
});

const repoType = new GraphQLObjectType({
  name: 'Repository',
  fields: {
    path: { type: GraphQLString },
    reference: {
      type: referenceType,
      args: {
        name: { type: GraphQLString },
      },
      resolve(repo, args) {
        return repo.getReference(args.name);
      },
    },
    log: {
      type: new GraphQLList(commitType),
      args: {
        reachableFrom: {
          type: new GraphQLList(GraphQLString),
          defaultValue: [],
        },
        notReachableFrom: {
          type: new GraphQLList(GraphQLString),
          defaultValue: [],
        },
        firstParent: {
          type: GraphQLBoolean,
          defaultValue: false,
        },
      },
      resolve(repo, { reachableFrom, notReachableFrom, firstParent }) {
        // TODO: Paginate response
        const revwalk = Git.Revwalk.create(repo);
        if (firstParent) {
          revwalk.simplifyFirstParent();
        }

        const revparse = committish => Git.Revparse.single(repo, committish).then(obj => obj.id());
        const reachableFromPromise = Promise.all(reachableFrom.map(revparse));
        const notReachableFromPromise = Promise.all(notReachableFrom.map(revparse));
        return Promise.all([reachableFromPromise, notReachableFromPromise])
          .then(([reachableFromOids, notReachableFromOids]) => {
            reachableFromOids.forEach(oid => revwalk.push(oid));
            notReachableFromOids.forEach(oid => revwalk.hide(oid));
          })
         .then(() => revwalk.getCommitsUntil(() => true));
      },
    },
  },
});

module.exports = repoType;
