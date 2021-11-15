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
