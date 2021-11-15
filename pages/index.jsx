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
