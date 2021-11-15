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
