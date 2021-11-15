# Automatically add subtitles to videos using Google Video Intelligence, Cloudinary and Next.js

## Introduction

Video subtitles provide a better viewing experience and also improves accessibility for persons with disabilities. Manually adding subtitles to videos, however, proves to be repetitive, boring and a lot of work. Luckily, there's a way we can automate this. In this tutorial, we'll take a look at how to automatically add subtitles to videos using [Google video intelligence](https://cloud.google.com/video-intelligence/docs/quickstart), [Cloudinary](https://cloudinary.com/?ap=em) and [Next.js](https://nextjs.org/).

## Setup

Working Knowledge of Javascript is required. Familiarity with React, Node.js and Next.js is also recommended although not required. Ensure you have Node.js and NPM installed on your development environment.

Create a new Next.js project by running the following command in your terminal.

```bash
npx create-next-app video-subtitles-with-google-video-intelligence
```

This scaffolds a minimal Next.js project. You can check out the [Next.js docs](https://nextjs.org/docs) for more setup options. Proceed to open your project in your favorite code editor.

### Cloudinary API Keys

Cloudinary offers a suite of APIs that allow developers to upload media, apply transformations and optimize delivery. You can get started with a free account immediately. Create a new account at [Cloudinary](https://cloudinary.com/?ap=em) if you do not have one then log in and navigate to the [console page](https://cloudinary.com/console). Here you'll find your `Cloud name` `API Key` and `API Secret`.

![Cloudinary Dashboard](https://github.com/newtonmunene99/video-subtitles-with-google-video-intelligence/blob/master/public/images/cloudinary-dashboard.png "Cloudinary Dashboard")

Back in your project, create a new file at the root of your project and name it `.env.local`. Paste the following inside.

```env
CLOUD_NAME=YOUR_CLOUD_NAME
API_KEY=YOUR_API_KEY
API_SECRET=YOUR_API_SECRET
```

Replace `YOUR_CLOUD_NAME` `YOUR_API_KEY` and `YOUR_API_SECRET` with the appropriate values that we just got from the [cloudinary console page](https://cloudinary.com/console).

What we've just done here is define some environment variables. These help us to keep sensitive keys and secrets away from our codebase. Next.js has built in support for environment variables. Read about this in the [docs](https://nextjs.org/docs/basic-features/environment-variables).

> Do not check the `.env.local` file into source control

### Google Cloud Project and credentials

The Video intelligence API is provided by google through the Google Cloud Platform. It contains several AI powered features that allow for things such as face detection, label detection, video transcription and more. Today we'll be using the [video transcription](https://cloud.google.com/video-intelligence/docs/transcription?hl=en) feature.

If you are familiar with GCP, you can follow the [quickstart guide](https://cloud.google.com/video-intelligence/docs/quickstart).

[Create an account](https://console.cloud.google.com/freetrial) if you do not already have one then navigate to the [project selector page](https://console.cloud.google.com/projectselector2/home/dashboard).

You then need to select an existing project or create a new one. Ensure that billing is enabled for tha project. Google APIs have a free tier with a monthly limit that you can get started with. Use the APIs with caution so as not to exceed your limits. Here's how you can  [confirm that billing is enabled.]('https://cloud.google.com/billing/docs/how-to/modify-project').

The next step is to enable the APIs that you will be using with that project. In our case it's just the Video Intelligence API. Here's how to [enable the Video Intelligence API](https://console.cloud.google.com/flows/enableapi?apiid=videointelligence.googleapis.com).

Once you've enabled the API, you need to create a new service account. Service accounts allow our application to authenticate with google and communicate with the GCP APIs. Go to the [create a new service account page](https://console.cloud.google.com/projectselector/iam-admin/serviceaccounts/create?supportedpurview=project) and select the project you created earlier. You will need to input an appropriate name for the service account. You can use the same name we used to create our Next.js project, `video-subtitles-with-google-video-intelligence`

![Create service account](https://github.com/newtonmunene99/video-subtitles-with-google-video-intelligence/blob/master/public/images/Screenshot1.png "Create service account").

Go ahead and finish creating the account. You can leave the other options as they are. Go back to the service accounts dashboard and you'll now see your recently created service account. Under the more actions button, click on Manage keys.

![Service accounts](https://github.com/newtonmunene99/video-subtitles-with-google-video-intelligence/blob/master/public/images/Screenshot2.png "Service accounts")

Click on **Add key** and then on **Create new key**

![Service account Keys dashboard](https://github.com/newtonmunene99/video-subtitles-with-google-video-intelligence/blob/master/public/images/Screenshot3.png "Service account Keys dashboard")

In the popup dialog, make sure to choose the **JSON** option.

![Service account Keys dashboard](https://github.com/newtonmunene99/video-subtitles-with-google-video-intelligence/blob/master/public/images/Screenshot4.png "Service account Keys dashboard")

Once you're done, a `.json` file will be downloaded to your computer.

Add the following to the `.env.local` file that we created earlier.

```env
GCP_PROJECT_ID=YOUR_GCP_PROJECT_ID
GCP_PRIVATE_KEY=YOUR_GCP_PRIVATE_KEY
GCP_CLIENT_EMAIL=YOUR_GCP_CLIENT_EMAIL
```

Replace `YOUR_GCP_PROJECT_ID`,`YOUR_GCP_PRIVATE_KEY` and `YOUR_GCP_CLIENT_EMAIL`, with `project_id`,`private_key` and `client_email` respectively from the `.json` file that was downloaded above.

### Dependencies

Final step in the setup is to install the required dependencies. We need [google video intelligence](https://www.npmjs.com/package/@google-cloud/video-intelligence), [cloudinary](https://www.npmjs.com/package/cloudinary), [formidable](https://www.npmjs.com/package/formidable), and [date-fns](https://www.npmjs.com/package/date-fns). We'll use formidable to help us parse incoming form data, this will allow us to upload videos from the frontend. date-fns is a library of date and time utilities.

Run the following command in your terminal

```bash
npm install cloudinary formidable date-fns @google-cloud/video-intelligence
```

## Getting started

Create a new folder at the root of your project and call it `lib`. This folder will contain all our shared code. Create a file named `parse-form.js` under the `lib` folder and paste the following inside.

```js
// lib/parse-form.js

import { IncomingForm } from "formidable";

/**
 * Parses the incoming form data.
 *
 * @param {NextApiRequest} req The incoming request object
 */
export const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ keepExtensions: true, multiples: true });

    form.parse(req, (error, fields, files) => {
      if (error) {
        return reject(error);
      }

      return resolve({ fields, files });
    });
  });
};

```

This file just sets up formidable so that we can be able to parse incoming form data. Read more in the [formidable docs](https://www.npmjs.com/package/formidable). 

Create another file under `lib` and name it `cloudinary.js`. Paste the following code inside `lib/cloudinary.js`.

```js
// lib/cloudinary.js

// Import the v2 api and rename it to cloudinary
import { v2 as cloudinary } from "cloudinary";

// Initialize the sdk with cloud_name, api_key and api_secret
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const CLOUDINARY_FOLDER_NAME = "automatic-subtitles/";

/**
 * Get cloudinary upload
 *
 * @param {string} id
 * @returns {Promise}
 */
export const handleGetCloudinaryUpload = (id) => {
  return cloudinary.api.resource(id, {
    type: "upload",
    prefix: CLOUDINARY_FOLDER_NAME,
    resource_type: "video",
  });
};

/**
 * Get cloudinary uploads
 * @returns {Promise}
 */
export const handleGetCloudinaryUploads = () => {
  return cloudinary.api.resources({
    type: "upload",
    prefix: CLOUDINARY_FOLDER_NAME,
    resource_type: "video",
  });
};

/**
 * Uploads a video to cloudinary and returns the upload result
 *
 * @param {{path: string; transformation?:TransformationOptions;publicId?: string; folder?: boolean; }} resource
 */
export const handleCloudinaryUpload = (resource) => {
  return cloudinary.uploader.upload(resource.path, {
    // Folder to store video in
    folder: resource.folder ? CLOUDINARY_FOLDER_NAME : null,
    // Public id of video.
    public_id: resource.publicId,
    // Type of resource
    resource_type: "auto",
    // Transformation to apply to the video
    transformation: resource.transformation,
  });
};

/**
 * Deletes resources from cloudinary. Takes in an array of public ids
 * @param {string[]} ids
 */
export const handleCloudinaryDelete = (ids) => {
  return cloudinary.api.delete_resources(ids, {
    resource_type: "video",
  });
};
```

This file contains all the functions we need to communicate with cloudinary. We first impport the v2 API from the cloudinary sdk and rename it to cloudinary. We then initialize it by calling the `config` method and passing the cloud name, api key and api secret.

`CLOUDINARY_FOLDER_NAME` is the folder where we'll store all our videos. This will make it easier for us to get all the uploads later.

`handleGetCloudinaryUpload` takes in a public id and gets a single resource from cloudinary by calling the `api.resource` method on the cloudinary SDK. Read more about this method in the [official docs](https://cloudinary.com/documentation/admin_api#get_the_details_of_a_single_resource)

`handleGetCloudinaryUploads` calls the `api.resources` method to get all resources uploaded to the folder that we defined under the `CLOUDINARY_FOLDER_NAME` variable. Read about this method in the [docs](https://cloudinary.com/documentation/admin_api#get_resources)

`handleCloudinaryUpload` takes in an object containing the path to the file we want to upload and any transformations that we want to apply to the file. It calls the `uploader.upload` method on the SDK. Read about this method [here](https://cloudinary.com/documentation/image_upload_api_reference)

`handleCloudinaryDelete` takes in an array of public IDs and passes them to the `api.delete_resources` method for deletion. Read more about this [here](https://cloudinary.com/documentation/admin_api#delete_resources).

Create a new file under `lib` folder and name it `google.js`. Paste the following inside `lib/google.js`.

```js
// lib/google.js

import {
  VideoIntelligenceServiceClient,
  protos,
} from "@google-cloud/video-intelligence";

const client = new VideoIntelligenceServiceClient({
  // Google cloud platform project id
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/gm, "\n"),
  },
});

/**
 *
 * @param {string | Uint8Array} inputContent
 * @returns {Promise<protos.google.cloud.videointelligence.v1.VideoAnnotationResults>}
 */
export const analyzeVideoTranscript = async (inputContent) => {
  // Grab the operation using array destructuring. The operation is the first object in the array.
  const [operation] = await client.annotateVideo({
    // Input content
    inputContent: inputContent,
    // Video Intelligence features
    features: ["SPEECH_TRANSCRIPTION"],
    // Video context settings
    videoContext: {
      speechTranscriptionConfig: {
        languageCode: "en-US",
        enableAutomaticPunctuation: true,
      },
    },
  });

  const [operationResult] = await operation.promise();

  // Gets annotations for video
  const [annotations] = operationResult.annotationResults;

  return annotations;
};
```

We create a new client and pass it the project id and a credentials object. [Here's](https://cloud.google.com/video-intelligence/docs/common/auth) the different ways you can authenticate the client. The `analyzeVideoTranscript` takes in a string or a buffer array and then calls the client's `annotateVideo` method with a few options. Read more about these options in the [docs](https://cloud.google.com/video-intelligence/docs/reference/rest/v1/videos/annotate). Take note of the features option. We need to tell Google what operation to run. In this case we only pass the `SPEECH_TRANSCRIPTION`. Read more about this [here](https://cloud.google.com/video-intelligence/docs/reference/rest/v1/videos/annotate#Feature).

We call `promise()` on the operation and await for the promise to complete. We then get the operation result using Javascript's destructuring. To understand the structure of the resulting data, take a look at the [official documentation](https://cloud.google.com/video-intelligence/docs/reference/rest/Shared.Types/AnnotateVideoResponse). We then proceed to get the first item in the annotation results and return that.

Create a new folder called `videos` under `pages/api`. Create two files inside `pages/api/videos`, one called `index.js` and `[...id].js`. If you're not familiar with API routes in Next.js, have a look at [this documentation](https://nextjs.org/docs/api-routes/introduction). `[...id].js` is an example of dynamic routing in Next.js. This particular syntax is designed to catch all routes. Read about this [here](https://nextjs.org/docs/routing/dynamic-routes#catch-all-routes). 

Paste the following code inside `pages/api/videos/index.js`

```js
// pages/api/videos/index.js

import {
  handleCloudinaryUpload,
  handleGetCloudinaryUploads,
} from "../../../lib/cloudinary";
import { parseForm } from "../../../lib/parse-form";
import { promises as fs } from "fs";
import { analyzeVideoTranscript } from "../../../lib/google";
import { intervalToDuration } from "date-fns";

// Custom config for our API route
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 *
 * @param {NextApiRequest} req
 * @param {NextApiResponse} res
 */
export default async function handler(req, res) {
  switch (req.method) {
    case "GET": {
      try {
        const result = await handleGetRequest();

        return res.status(200).json({ message: "Success", result });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ message: "Error", error });
      }
    }

    case "POST": {
      try {
        const result = await handlePostRequest(req);

        return res.status(201).json({ message: "Success", result });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ message: "Error", error });
      }
    }

    default: {
      return res.status(405).json({ message: "Method Not Allowed" });
    }
  }
}

const handleGetRequest = async () => {
  const uploads = await handleGetCloudinaryUploads();

  return uploads;
};

/**
 * Handles the POST request to the API route.
 *
 * @param {NextApiRequest} req The incoming request object
 */
const handlePostRequest = async (req) => {
  // Get the form data using the parseForm function
  const data = await parseForm(req);

  // Get the video file from the form data
  const { video } = data.files;

  // Read the contents of the video file
  const videoFile = await fs.readFile(video.filepath);

  // Get the base64 encoded video file
  const base64Video = videoFile.toString("base64");

  // Analyze the video transcript using Google's video intelligence API
  const annotations = await analyzeVideoTranscript(base64Video);

  // Map through the speech transcriptions gotten from the annotations
  const allSentences = annotations.speechTranscriptions
    .map((speechTranscription) => {
      // Map through the speech transcription's alternatives. For our case it's just one
      return speechTranscription.alternatives
        .map((alternative) => {
          // Get the word segments from the speech transcription
          const words = alternative.words ?? [];

          // Place the word segments into an groups of ten
          const groupOfTens = words.reduce((group, word, arr) => {
            return (
              (arr % 10
                ? group[group.length - 1].push(word)
                : group.push([word])) && group
            );
          }, []);

          // Map through the word groups and build a sentence with the start time and end time
          return groupOfTens.map((group) => {
            // Start offset time in seconds
            const startOffset =
              parseInt(group[0].startTime.seconds ?? 0) +
              (group[0].startTime.nanos ?? 0) / 1000000000;

            // End offset time in seconds
            const endOffset =
              parseInt(group[group.length - 1].endTime.seconds ?? 0) +
              (group[group.length - 1].endTime.nanos ?? 0) / 1000000000;

            return {
              startTime: startOffset,
              endTime: endOffset,
              sentence: group.map((word) => word.word).join(" "),
            };
          });
        })
        .flat();
    })
    .flat();

  // Build the subtitle file content
  const subtitleContent = allSentences
    .map((sentence, index) => {
      // Format the start time
      const startTime = intervalToDuration({
        start: 0,
        end: sentence.startTime * 1000,
      });

      // Format the end time
      const endTime = intervalToDuration({
        start: 0,
        end: sentence.endTime * 1000,
      });

      return `${index + 1}\n${startTime.hours}:${startTime.minutes}:${
        startTime.seconds
      },000 --> ${endTime.hours}:${endTime.minutes}:${endTime.seconds},000\n${
        sentence.sentence
      }`;
    })
    .join("\n\n");

  const subtitlePath = `public/subtitles/subtitle.srt`;

  // Write the subtitle file to the filesystem
  await fs.writeFile(subtitlePath, subtitleContent);

  // Upload the subtitle file to Cloudinary
  const subtitleUploadResult = await handleCloudinaryUpload({
    path: subtitlePath,
    folder: false,
  });

  // Delete the subtitle file from the filesystem
  await fs.unlink(subtitlePath);

  // Upload the video file to Cloudinary and apply the subtitle file as an overlay/layer
  const videoUploadResult = await handleCloudinaryUpload({
    path: video.filepath,
    folder: true,
    transformation: [
      {
        background: "black",
        color: "yellow",
        overlay: {
          font_family: "Arial",
          font_size: "32",
          font_weight: "bold",
          resource_type: "subtitles",
          public_id: subtitleUploadResult.public_id,
        },
      },
      { flags: "layer_apply" },
    ],
  });

  return videoUploadResult;
};

```

This is where the magic happens. At the top we export a custom config object. This config object tells Next.js not to use the default body parser since we'll be parsing the form data on our own. Read about custom config in API routes [here](https://nextjs.org/docs/api-routes/api-middlewares#custom-config). The default exported function named `handler` is standard for Next.js API routes. We use a switch statement to only handle GET and POST requests.

`handleGetRequest` gets all the uploaded resources by calling the `handleGetCloudinaryUploads` function that we created earlier.

`handlePostRequest` takes in the incoming request object. We use the `parseForm` method that we created in the `parse-form.js` file to get the form data. We then get the video file, get the base64 string and pass it to `analyzeVideoTranscript`. This video transcribes the video using Google Video Intelligence. The following is the structure of the data that we get back

```ts
{
  segment: {
    startTimeOffset: {
      seconds: string;
      nanos: number;
    };
    endTimeOffset: {
      seconds: string;
      nanos: number;
    };
  };
  speechTranscriptions: [
    {
      alternatives: [
        {
          transcript: string;
          confidence: number;
          words: [
            {
              startTime: {
                seconds: string;
                nanos: number;
              };
              endTime: {
                seconds: string;
                nanos: number;
              };
              word: string;
            }
          ];
        }
      ];
      languageCode: string;
    }
  ];
}
```

You can also check out some sample data [here](https://github.com/newtonmunene99/video-subtitles-with-google-video-intelligence/blob/master/sample-data.js)

We need to convert that to the following structure

```ts
[
  {
    startTime: number;
    endTime: number;
    sentence: string;
  }
]
```

To achieve this we map through the `annotations.speechTranscriptions`, then the `alternatives` for each speech transcription. Google returns each word separate with its start and end time. We put those words in groups of ten so that we can form sentences with ten words. We don't want our sentences to be too long. We then join the group of words to make a sentence and flatten everything. 

Next we need to create a subtitle file. Let's have a look at the structure of a subtitles(srt) file. 

```srt
number
hour:minute:second,millisecond --> hour:minute:second,millisecond
sentence

number
hour:minute:second,millisecond --> hour:minute:second,millisecond
sentence
```

For example

```srt
1
00:01:20,000 --> 00:01:30,000
This is the first frame

2
00:01:31,000 --> 00:01:40,000
This is the second frame
```

We model our data into this format in the following piece of code

```js
// Build the subtitle file content
const subtitleContent = allSentences
  .map((sentence, index) => {
    // Format the start time
    const startTime = intervalToDuration({
      start: 0,
      end: sentence.startTime * 1000,
    });

    // Format the end time
    const endTime = intervalToDuration({
      start: 0,
      end: sentence.endTime * 1000,
    });

    return `${index + 1}\n${startTime.hours}:${startTime.minutes}:${
      startTime.seconds
    },000 --> ${endTime.hours}:${endTime.minutes}:${endTime.seconds},000\n${
      sentence.sentence
    }`;
  })
  .join("\n\n");
```

We then use `writeFile` to create a new subtitle file. We upload the subtitle file to cloudinary. After this is done we upload our video to cloudinary and apply the subtitle file as a layer. Read about how this works in the [cloudinary docs](https://cloudinary.com/documentation/video_manipulation_and_delivery#adding_subtitles).

Moving on to the `[...id].js` file. Paste the following inside `pages/api/videos/[...id].js`

```js
// pages/api/videos/[...id].js`

import { NextApiRequest, NextApiResponse } from "next";
import {
  handleCloudinaryDelete,
  handleGetCloudinaryUpload,
} from "../../../lib/cloudinary";

/**
 *
 * @param {NextApiRequest} req
 * @param {NextApiResponse} res
 */
export default async function handler(req, res) {
  const id = Array.isArray(req.query.id)
    ? req.query.id.join("/")
    : req.query.id;

  switch (req.method) {
    case "GET": {
      try {
        const result = await handleGetRequest(id);

        return res.status(200).json({ message: "Success", result });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ message: "Error", error });
      }
    }

    case "DELETE": {
      try {
        const result = await handleDeleteRequest(id);

        return res.status(200).json({ message: "Success", result });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ message: "Error", error });
      }
    }

    default: {
      return res.status(405).json({ message: "Method Not Allowed" });
    }
  }
}

/**
 * Gets a sindle resource from Cloudinary.
 *
 * @param {string} id Public ID of the video to get
 */
const handleGetRequest = async (id) => {
  const upload = await handleGetCloudinaryUpload(id);

  return upload;
};

/**
 * Handles the DELETE request to the API route.
 *
 * @param {string} id Public ID of the video to delete
 */
const handleDeleteRequest = (id) => {
  // Delete the uploaded image from Cloudinary
  return handleCloudinaryDelete([id]);
};

```

`handleGetRequest` calls the `handleGetCloudinaryUpload` with the public id of the video and gets the uploaded video.

`handleDeleteRequest` just deletes the resource with the given public id.

Let's move on to the frontend. Add the following code to `styles/globals.css`

```css
:root {
  --color-primary: #ff0000;
  --color-primary-light: #ff4444;
}

.btn {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: var(--color-primary);
  color: #ffffff;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 1rem;
  font-weight: bold;
  text-transform: uppercase;
  text-decoration: none;
  text-align: center;
  transition: all 0.2s ease-in-out;
}

.btn:hover {
  background: var(--color-primary-light);
  box-shadow: 0 0 0.25rem 0 rgba(0, 0, 0, 0.25);
}

```

These are just a few styles to help us with the UI.

Create a new folder at the root of your project and name it `components`. This folder will hold our shared components. Create a new file under `components` called `Layout.js` and paste the following code inside.

```jsx
// components/Layout.js

import Head from "next/head";
import Link from "next/link";

export default function Layout({ children }) {
  return (
    <div>
      <Head>
        <title>
          Add subtitles to videos using google video intelligence and cloudinary
        </title>
        <meta
          name="description"
          content=" Add subtitles to videos using google video intelligence and cloudinary"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <nav>
        <ul>
          <li>
            <Link href="/">
              <a className="btn">Home</a>
            </Link>
          </li>
          <li>
            <Link href="/videos">
              <a className="btn">Videos</a>
            </Link>
          </li>
        </ul>
      </nav>
      <main>{children}</main>
      <style jsx>{`
        nav {
          background-color: #f0f0f0;
          min-height: 100px;
          display: flex;
          align-items: center;
        }

        nav ul {
          list-style: none;
          padding: 0 32px;
          flex: 1;
          display: flex;
          flex-flow: row nowrap;
          justify-content: center;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}

```

We'll be wrapping our pages in this component. It allows us to have a consistent layout. Paste the following code inside `pages/index.js`

```jsx
// pages/index.js

import { useRouter } from "next/router";
import { useState } from "react";
import Layout from "../components/Layout";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    try {
      setIsLoading(true);

      const formData = new FormData(event.target);

      const response = await fetch("/api/videos", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw data;
      }

      router.push("/videos");
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="wrapper">
        <form onSubmit={handleFormSubmit}>
          <h2>Upload video file</h2>
          <div className="input-group">
            <label htmlFor="video">Video File</label>
            <input
              type="file"
              name="video"
              id="video"
              accept=".mp4,.mov,.mpeg4,.avi"
              multiple={false}
              required
              disabled={isLoading}
            />
          </div>
          <button className="btn" type="submit" disabled={isLoading}>
            Upload
          </button>
          <button className="btn" type="reset" disabled={isLoading}>
            Cancel
          </button>
        </form>
      </div>
      <style jsx>{`
        div.wrapper {
        }

        div.wrapper > form {
          margin: 64px auto;
          background-color: #fdd8d8;
          padding: 40px 20px;
          width: 60%;
          display: flex;
          flex-flow: column;
          gap: 8px;
          border-radius: 0.25rem;
        }

        div.wrapper > form > div.input-group {
          display: flex;
          flex-flow: column;
          gap: 8px;
        }

        div.wrapper > form > div.input-group > label {
          font-weight: bold;
        }

        div.wrapper > form > div.input-group > input {
          background-color: #f5f5f5;
        }

        div.wrapper > form > button {
          height: 50px;
        }
      `}</style>
    </Layout>
  );
}

```

This is a simple page with a form for uploading the video that we want to add subtitles to. `handleFormSubmit` makes a POST request to `/api/videos` with the form data and then navigates to the `/videos` page upon success. 

Create a new folder under `pages` folder and call it `videos`. Create two files under `pages/videos` called `index.js` and `[...id].js`. Please note that this is not the same as the `pages/api/videos` folder. Paste the following code inside `pages/videos/index.js`

```jsx
// pages/videos/index.js

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import Layout from "../../components/Layout";

export default function VideosPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [videos, setVideos] = useState([]);

  const getVideos = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/videos", {
        method: "GET",
      });

      const data = await response.json();

      if (!response.ok) {
        throw data;
      }

      setVideos(data.result.resources);
      console.log(data);
    } catch (error) {
      // TODO: Show error message to user
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    getVideos();
  }, [getVideos]);

  return (
    <Layout>
      <div className="wrapper">
        <div className="videos-wrapper">
          {videos.map((video, index) => {
            const splitVideoUrl = video.secure_url.split(".");

            splitVideoUrl[splitVideoUrl.length - 1] = "jpg";

            const thumbnail = splitVideoUrl.join(".");

            return (
              <div className="video-wrapper" key={`video-${index}`}>
                <div className="thumbnail">
                  <Image
                    src={thumbnail}
                    alt={video.secure_url}
                    layout="fill"
                  ></Image>
                </div>
                <div className="actions">
                  <Link
                    href="/videos/[...id]"
                    as={`/videos/${video.public_id}`}
                  >
                    <a>Open Video</a>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!isLoading && videos.length === 0 ? (
        <div className="no-videos">
          <b>No videos yet</b>
          <Link href="/" passHref>
            <button className="btn">Upload Video</button>
          </Link>
        </div>
      ) : null}

      {isLoading ? (
        <div className="loading">
          <b>Loading...</b>
        </div>
      ) : null}

      <style jsx>{`
        div.wrapper {
          min-height: 100vh;
        }

        div.wrapper h1 {
          text-align: center;
        }

        div.wrapper div.videos-wrapper {
          padding: 20px;
          display: flex;
          flex-flow: row wrap;
          gap: 20px;
        }

        div.wrapper div.videos-wrapper div.video-wrapper {
          flex: 0 0 400px;
          height: 400px;
        }

        div.wrapper div.videos-wrapper div.video-wrapper div.thumbnail {
          position: relative;
          width: 100%;
          height: 80%;
        }

        div.loading,
        div.no-videos {
          height: 100vh;
          display: flex;
          flex-flow: column;
          justify-content: center;
          align-items: center;
          gap: 8px;
        }
      `}</style>
    </Layout>
  );
}

```

This page will call `getVideos` when it renders. `getVideos` makes a GET request to `/api/videos` to get all the uploaded videos. You can read about the `useCallback` and `useEffect` react hooks from the [react docs](https://reactjs.org/docs/hooks-reference.html). We then show thumbnails of the videos. See [here](https://cloudinary.com/documentation/video_manipulation_and_delivery#generating_video_thumbnails) on how to generate a thumbnail of a cloudinary video. 

And now for the final page. Paste the following inside `pages/videos/[...id].js`

```jsx
// pages/videos/[...id].js

import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import Layout from "../../components/Layout";

export default function VideoPage() {
  const router = useRouter();

  const id = Array.isArray(router.query.id)
    ? router.query.id.join("/")
    : router.query.id;

  const [isLoading, setIsLoading] = useState(false);
  const [video, setVideo] = useState(null);

  const getVideo = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/videos/${id}`, {
        method: "GET",
      });

      const data = await response.json();

      if (!response.ok) {
        throw data;
      }

      setVideo(data.result);
      console.log(data);
    } catch (error) {
      // TODO: Show error message to user
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    getVideo();
  }, [getVideo]);

  const handleDownload = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(video.secure_url, {});

      if (response.ok) {
        const blob = await response.blob();

        const fileUrl = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = fileUrl;
        a.download = `${video.public_id.replace("/", "-")}.${video.format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }

      throw await response.json();
    } catch (error) {
      // TODO: Show error message to user
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/videos/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw data;
      }

      router.replace("/videos");
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      {video && !isLoading ? (
        <div className="wrapper">
          <div className="video-wrapper">
            <video src={video.secure_url} controls></video>
            <div className="actions">
              <button
                className="btn"
                onClick={handleDownload}
                disabled={isLoading}
              >
                Download
              </button>
              <button
                className="btn"
                onClick={handleDelete}
                disabled={isLoading}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="loading">
          <b>Loading...</b>
        </div>
      ) : null}

      <style jsx>{`
        div.wrapper {
        }

        div.wrapper > div.video-wrapper {
          width: 80%;
          margin: 20px auto;
          display: flex;
          flex-flow: column;
          gap: 8px;
        }

        div.wrapper > div.video-wrapper > video {
          width: 100%;
        }

        div.wrapper > div.video-wrapper > div.actions {
          display: flex;
          flex-flow: row;
          gap: 8px;
        }

        div.loading {
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
        }
      `}</style>
    </Layout>
  );
}
```

`getVideo` makes a GET request to `/api/videos/:id` to get the video with the given id. `handleDownload` just downloads the video file. `handleDelete` makes a DELETE request to `/api/videos/:id` to delete the video with the given id.

For the final piece of the puzzle. Add the following to `next.config.js`.


```js
module.exports = {
  // ... other options
  images: {
    domains: ["res.cloudinary.com"],
  },
};
```

This is because we're using the Image component from Next.js. We need to add the cloudinary domain so that images from that domain can be optimized. Read more about this [here](https://nextjs.org/docs/api-reference/next/image#configuration-options)

You can now run your application by running the following command

```bash
npm run dev
```

And that's a wrap for this tutorial. You can find the full code on my [Github](https://github.com/newtonmunene99/video-subtitles-with-google-video-intelligence). Please note that this is just a simple demonstration. There's a lot of ways you could optimize your application. Have a look at Google's [long running operations](https://cloud.google.com/video-intelligence/docs/long-running-operations?hl=en) and Cloudinary's [notifications](https://cloudinary.com/documentation/notifications)