var admin = require("firebase-admin");
const { getStorage, getDownloadURL } = require("firebase-admin/storage");
var serviceAccount = require("../private/serviceAccountKey.json");
const stream = require("stream");

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: `${process.env.BUCKET_NAME}.appspot.com`,
});

// The origin for this CORS config to allow requests from
const origin = "http://localhost:5173";

// The response header to share across origins
const responseHeader = "Content-Type";

// The maximum amount of time the browser can make requests before it must
// repeat preflighted requests
const maxAgeSeconds = 3600;

// The name of the method
// See the HttpMethod documentation for other HTTP methods available:
// https://cloud.google.com/appengine/docs/standard/java/javadoc/com/google/appengine/api/urlfetch/HTTPMethod
const method = "GET";

async function configureBucketCors(bucket) {
  await bucket.setCorsConfiguration([
    {
      maxAgeSeconds,
      method: [method],
      origin: [origin],
      responseHeader: [responseHeader],
    },
  ]);

  console.log(`Bucket  was updated with a CORS config
      to allow ${method} requests from ${origin} sharing 
      ${responseHeader} responses across origins`);
}

const bucket = getStorage(app).bucket();

// configureBucketCors(bucket).catch(console.error);
exports.uploadFileToFb = async function ({ destination, path, options }) {
  const storage = await bucket.upload(path, { destination, ...options });
  console.log(`${path} uploaded to ${destination}`);
  console.log(`storage`, storage[0]);

  const fileRef = bucket.file(destination);
  const link = await getDownloadURL(fileRef);

  return link;
};

// module.exports = bucket;
