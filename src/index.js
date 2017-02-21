const Git = require('nodegit');
const { GraphQLString,
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
      // TODO blob, tag
      case Git.Commit:
        return commitType;
      case Git.Tree:
        return treeType;
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

const treeEntryType = new GraphQLObjectType({
  name: 'TreeEntry',
  fields: {
    sha: { type: GraphQLString },
    path: { type: GraphQLString },
  },
});

const treeType = new GraphQLObjectType({
  name: 'Tree',
  interfaces: [objectType],
  fields: {
    oid: {
      type: GraphQLString,
      resolve(tree) {
        return tree.id();
      },
    },
    path: { type: GraphQLString },
    entries: {
      type: new GraphQLList(treeEntryType),
      resolve(tree) {
        return tree.entries();
      },
    },
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
      date: {
        type: GraphQLString,
        resolve(commit) {
          return commit.date().toISOString();
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
      tree: {
        type: treeType,
        resolve(commit) {
          return commit.getTree();
        },
      },
    };
  },
});

function resolveOid(repo, oid) {
  return Git.Object.lookup(repo, oid, Git.Object.TYPE.ANY).then((obj) => {
    switch (obj.type()) {
      // TODO: BLOB, TAG
      case Git.Object.TYPE.COMMIT:
        return repo.getCommit(oid);
      case Git.Object.TYPE.TREE:
        return repo.getTree(oid);
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
    commit: {
      type: commitType,
      args: {
        oid: { type: GraphQLString },
      },
      resolve(repo, args) {
        return repo.getCommit(args.oid);
      },
    },
  },
});

module.exports = repoType;
