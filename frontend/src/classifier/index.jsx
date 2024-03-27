import React, { useEffect, useRef, useState } from "react";

const Classifier = () => {
  const canvasRef = useRef();
  const imageRef = useRef();
  const videoRef = useRef();

  const [result, setResult] = useState("");
  const [selectedOption, setSelectedOption] = useState(null);
  const [streamStarted, setStreamStarted] = useState(false);

  useEffect(() => {
    if (streamStarted) {
      const interval = setInterval(() => {
        captureImageFromCamera();
      }, 1000); 

      return () => clearInterval(interval);
    }
  }, [streamStarted]);

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.oncanplay = () => {
          setStreamStarted(true);
        };
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const handleOptionChange = async (option) => {
    setSelectedOption(option);
    if (option === "camera") {
      await requestCameraPermission();
    }
  };

  const captureImageFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext('2d');
    const { videoWidth, videoHeight } = videoRef.current;

    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    // Clear the canvas before drawing the new frame
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);


    context.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);

    canvasRef.current.toBlob((blob) => {
      classifyImage(blob); 
    });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const reader = new FileReader();
        reader.onload = function (e) {
          const img = new Image();
          img.onload = function () {
            const context = canvasRef.current.getContext('2d');
            canvasRef.current.width = img.width;
            canvasRef.current.height = img.height;
            context.drawImage(img, 0, 0);
            classifyImage(file); 
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error("Error handling file upload:", error);
        setResult("Error: Failed to upload file.");
      }
    } else {
      setResult("Error: No file selected.");
    }
  };

  const classifyImage = async (imageData) => {
    try {
      if (imageData) {
        // Create a FormData object to send the image data to the server
        const formData = new FormData();
        formData.append('image', imageData);
  
        // Send a POST request to the '/classify' endpoint with the image data
        const response = await fetch('/classify', {
          method: "POST",
          body: formData,
        });
  
        if (response.status === 200) {
          // If successful, extract the text response from the server
          const text = await response.text();
          // Update the result state with the classification result
          setResult(text);
        } else {
          setResult("Error from API.");
        }
      } else {
        // Handle case where imageData is not available 
        setResult("Error: No image data available.");
      }
    } catch (error) {
      console.error("Error classifying image:", error);
      setResult("Error: Failed to classify image.");
    }
  };

  return (
    <>
      <h1>Image classifier</h1>
      <div>
        <label>
          <input
            type="radio"
            value="camera"
            checked={selectedOption === "camera"}
            onChange={() => handleOptionChange("camera")}
          />
          Camera Stream
        </label>
        <label>
          <input
            type="radio"
            value="file"
            checked={selectedOption === "file"}
            onChange={() => handleOptionChange("file")}
          />
          File Upload
        </label>
      </div>
      {selectedOption === "camera" && (
        <>
          <video ref={videoRef} hidden={!streamStarted} autoPlay />
          <canvas ref={canvasRef} hidden></canvas>
        </>
      )}
      {selectedOption === "file" && (
        <>
          <input type="file" accept="image/*" onChange={handleFileUpload} />
          <canvas ref={canvasRef} />
        </>
      )}
      <p>Currently seeing: {result}</p>
    </>
  );
};

export default Classifier;
