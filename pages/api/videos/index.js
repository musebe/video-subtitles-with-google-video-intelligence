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
