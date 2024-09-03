const { isObjectIdOrHexString } = require("mongoose");

// only use for transform of plain obj
function replaceId(doc, ret, options) {
  if (options.replace) {
    Object.keys(options.replace).forEach(function (oldKey) {
      const newKey = options.replace[oldKey];
      if (ret[oldKey]) {
        ret[newKey] = ret[oldKey];
        delete ret[oldKey];
      }
    });
  }
  return ret;
}
// const rawObj = {
//   notTransform: "notTransform",
//   _id: "id",
//   _date: new Date(),
//   address: {
//     notTransform2: "notTransform2",
//     city: "Hanoi",
//     anniverDate: new Date(),
//   },
// };

// const transformMap2 = {
//   _id: {
//     newKey: "id",
//   },
//   _date: {
//     newKey: "date",
//   },
//   address: {
//     newKey: "zcode",
//     nestedKey: {
//       city: {
//         newKey: "province",
//         handle: (val) => "Province " + val,
//       },
//       anniverDate: {
//         newKey: "anniver",
//       },
//     },
//   },
// };

// transformObj(rawObj, transformMap2);
// console.log(rawObj);

// NOTE: this will modify rawObj,
function transformObj(rawObj, transformMap) {
  // Function to apply transformations directly on the rawObj
  function applyTransform(obj, map) {
    Object.keys(map).forEach((key) => {
      const mapEntry = map[key];
      const { newKey, handle, ...nestedKeys } = mapEntry;

      // Check if the key exists in the object to be transformed
      if (obj.hasOwnProperty(key)) {
        const oldValue = obj[key];

        // If there's a newKey, update the key name
        if (newKey) {
          obj[newKey] = oldValue;
          delete obj[key];
        }

        // If there's a handle function, apply it to the value
        if (handle && obj.hasOwnProperty(newKey)) {
          obj[newKey] = handle(oldValue);
        }

        // If there are nested keys, recursively apply transformations
        if (nestedKeys && typeof oldValue === "object" && oldValue !== null) {
          Object.keys(nestedKeys).forEach((nestedKey) => {
            // Ensure nestedKey is an actual object before recursion
            if (
              typeof nestedKeys[nestedKey] === "object" &&
              nestedKeys[nestedKey] !== null
            ) {
              applyTransform(obj[newKey], nestedKeys[nestedKey]);
            }
          });
        }
      }
    });
  }

  // Apply transformations directly to the rawObj
  applyTransform(rawObj, transformMap);

  return rawObj;
}

const transformId = {
  _id: {
    newKey: "id",
  },
};

const transformFriendReq = {
  _id: {
    newKey: "id",
  },
  senderId: {
    newKey: "sender",
    nestedKey: {
      _id: {
        newKey: "id",
      },
    },
  },
  recipientId: {
    newKey: "recipient",
    nestedKey: {
      _id: {
        newKey: "id",
      },
    },
  },
};

exports.replaceId = replaceId;
exports.transformObj = transformObj;
exports.transformId = transformId;
exports.transformFriendReq = transformFriendReq;
