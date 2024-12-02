import React, { useState, useEffect, useRef } from "react";
import * as faceapi from "face-api.js";
import { Box, Button, Typography } from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RemoveRedEyeIcon from "@mui/icons-material/RemoveRedEye";
import LightModeIcon from "@mui/icons-material/LightMode";
import WarningIcon from "@mui/icons-material/Warning";
import ReactWebcam from "react-webcam";
import { CircularProgress } from "@mui/material";
import AuthenticatedProfile from "./AuthenticatedProfile";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

const FaceAuthentication = ({ registeredFaces, onAuthenticated }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [match, setMatch] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [facesStatus, setFacesStatus] = useState("no-face");
  const [isFaceMatcherLoaded, setIsFaceMatcherLoaded] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [isValidAadhaar, setIsValidAadhaar] = useState(false);
  const [linkedFace, setLinkedFace] = useState(null);

  const handleAadhaarChange = (e) => {
    const value = e.target.value.replace(/\s+/g, ""); // Remove spaces
    if (/^\d{0,12}$/.test(value)) {
      const formattedValue = value
        .replace(/(\d{4})(?=\d)/g, "$1 ") // Add spaces every 4 digits
        .trim();
      setAadhaarNumber(formattedValue);

      if (value.length === 12) {
        const faceData = registeredFaces.find((face) => face.number === value);
        if (faceData) {
          setLinkedFace(faceData);
          setIsValidAadhaar(true);
        } else {
          setIsValidAadhaar(false);
          alert("Aadhaar number not found in the database.");
        }
      } else {
        setIsValidAadhaar(false);
      }
    }
  };

  const [instructions, setInstructions] = useState({
    camera: false,
    lighting: false,
  });

  const webcamRef = useRef(null);
  const [faceMatcher, setFaceMatcher] = useState(null);

  useEffect(() => {
    // Check if the webcam is accessible
    const checkCameraAccess = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraError(null); // Clear any previous errors if camera is accessible
      } catch (err) {
        setCameraError(
          "Camera access denied. Please allow access to your camera."
        );
      }
    };
    checkCameraAccess();
  });

  // Initialize face matcher when registered faces change
  useEffect(() => {
    if (registeredFaces.length > 0) {
      const labeledDescriptors = registeredFaces.map(
        (face) =>
          new faceapi.LabeledFaceDescriptors(face.name, [face.descriptor])
      );
      const matcher = new faceapi.FaceMatcher(labeledDescriptors, 0.45);
      setFaceMatcher(matcher);
      setIsFaceMatcherLoaded(true); // Mark face matcher as loaded
    } else {
      setIsFaceMatcherLoaded(false); // Reset if there are no registered faces
    }
  }, [registeredFaces]);

  // Function to handle face detection continuously
  const handleFaceDetection = async () => {
    const videoElement = webcamRef.current?.video;
    if (!videoElement) return;

    const detections = await faceapi
      .detectAllFaces(videoElement)
      .withFaceLandmarks();

    if (detections.length === 0) {
      setFacesStatus("no-face");
    } else if (detections.length === 1) {
      setFacesStatus("one-face");
    } else {
      setFacesStatus("multiple-faces"); // Updated for 2 or more faces
    }
  };

  // Run face detection every 500ms
  useEffect(() => {
    const intervalId = setInterval(() => {
      handleFaceDetection();
    }, 500); // Checking for face detection every 500ms

    return () => clearInterval(intervalId); // Cleanup on component unmount
  }, []);

  const handleAuthenticate = async () => {
    if (!linkedFace) {
      alert("No face data linked with this Aadhaar number.");
      return;
    }

    const imageSrc = webcamRef.current.getScreenshot(); // Get base64 image from webcam
    setIsAuthenticating(true);

    try {
      const img = new Image();
      img.src = imageSrc;

      img.onload = async () => {
        const detections = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detections && faceMatcher) {
          const bestMatch = faceMatcher.findBestMatch(detections.descriptor);

          if (
            bestMatch.label.trim().toLowerCase() ===
            linkedFace.name.trim().toLowerCase()
          ) {
            onAuthenticated(linkedFace.name); // Redirect on success
          } else {
            alert("Face authentication failed.");
          }
        } else {
          alert("No face detected.");
        }
      };
    } catch (error) {
      console.error("Authentication error:", error);
    }

    setIsAuthenticating(false);
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        padding: "20px",
        gap: 4, // Space between columns
      }}
    >
      {/* Left Section */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          flex: 1,
          maxWidth: "300px",
        }}
      >
        {/* Aadhaar Input */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            width: "100%",
          }}
        >
          <Typography
            variant="body5"
            sx={{ color: "#000", fontWeight: "bold" }}
          >
            Enter Aadhaar Number:
          </Typography>
          <Box
            sx={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              width: "100%",
            }}
          >
            <input
              type="text"
              value={aadhaarNumber}
              onChange={handleAadhaarChange}
              placeholder="XXXX XXXX XXXX"
              style={{
                padding: "10px",
                fontSize: "16px",
                width: "100%",
                borderRadius: "8px",
                border: `2px solid ${
                  isValidAadhaar ? "green" : aadhaarNumber ? "red" : "gray"
                }`,
                outline: "none",
                transition: "border-color 0.3s",
              }}
            />
            {aadhaarNumber && (
              <Box
                sx={{
                  position: "absolute",
                  right: "10px",
                  color: isValidAadhaar ? "green" : "red",
                  fontSize: "15px",
                }}
              >
                {isValidAadhaar ? "✔️ Valid" : "❌ Invalid"}
              </Box>
            )}
          </Box>
        </Box>

        {/* Face Matcher Status */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            border: "2px solid",
            borderColor: isFaceMatcherLoaded ? "#00e500" : "orange",
            borderRadius: "8px",
            padding: "8px",
            backgroundColor: "rgba(0, 0, 0, 0.1)",
            transition: "border-color 0.3s ease",
          }}
        >
          {isFaceMatcherLoaded ? (
            <Box
              sx={{
                color: "#00b200",
                display: "flex",
                alignItems: "center",
              }}
            >
              <CheckCircleIcon sx={{ mr: 1 }} />
              <Typography variant="body2">Face matcher is ready</Typography>
            </Box>
          ) : (
            <Box
              sx={{
                color: "orange",
                display: "flex",
                alignItems: "center",
              }}
            >
              <CircularProgress size={20} sx={{ mr: 1 }} />
              <Typography variant="body2">Loading face matcher...</Typography>
            </Box>
          )}
        </Box>

        {/* Face Detection Status */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            border: "2px solid",
            borderColor:
              facesStatus === "no-face"
                ? "red"
                : facesStatus === "multiple-faces"
                ? "orange"
                : "#00e500",
            borderRadius: "8px",
            padding: "8px",
            backgroundColor: "rgba(0, 0, 0, 0.1)",
            transition: "border-color 0.3s ease",
          }}
        >
          {facesStatus === "no-face" && (
            <Box sx={{ color: "red", display: "flex", alignItems: "center" }}>
              <WarningIcon sx={{ mr: 1 }} />
              <Typography variant="body2">No face detected</Typography>
            </Box>
          )}
          {facesStatus === "multiple-faces" && (
            <Box
              sx={{ color: "orange", display: "flex", alignItems: "center" }}
            >
              <WarningIcon sx={{ mr: 1 }} />
              <Typography variant="body2">Multiple faces detected</Typography>
            </Box>
          )}
          {facesStatus === "one-face" && (
            <Box
              sx={{ color: "#00b200", display: "flex", alignItems: "center" }}
            >
              <CheckCircleIcon sx={{ mr: 1 }} />
              <Typography variant="body2">Ready to Authenticate</Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Center Section (Webcam and Button) */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          flex: 1.5,
          maxWidth: "600px",
        }}
      >
        {/* Webcam Feed */}
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: "300px",
            backgroundColor: "white",
            borderRadius: "18px",
            overflow: "hidden",
            boxShadow: 3,
          }}
        >
          <ReactWebcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              facingMode: "user",
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: "15%",
              left: "20%",
              right: "20%",
              bottom: "25%",
              border: "2px dashed #00C853",
              borderRadius: "12px",
              pointerEvents: "none",
            }}
          ></Box>
        </Box>

        {/* Authenticate Button */}
        <Button
          variant="contained"
          color="success"
          onClick={handleAuthenticate}
          disabled={
            !isValidAadhaar ||
            !linkedFace ||
            isAuthenticating ||
            cameraError ||
            facesStatus !== "one-face" ||
            !isFaceMatcherLoaded
          }
          startIcon={<CameraAltIcon />}
          sx={{
            width: "100%", // Makes the button as wide as the parent
            borderRadius: "12px",
            textTransform: "none",
            fontSize: "18px",
            padding: "10px 20px",
          }}
        >
          {isAuthenticating ? "Authenticating..." : "Authenticate"}
        </Button>
      </Box>

      {/* Right Section (Instructions) */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          flex: 1,
          maxWidth: "300px",
        }}
      >
        <Typography variant="h6">Follow these instructions:</Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <RemoveRedEyeIcon sx={{ color: "green" }} />
            <Typography variant="body2">
              Look directly at your camera.
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CheckCircleIcon sx={{ color: "green" }} />
            <Typography variant="body2">
              Position your face within the green frame.
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <LightModeIcon sx={{ color: "green" }} />
            <Typography variant="body2">
              Ensure good lighting on your face.
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <VisibilityOffIcon sx={{ color: "green" }} />
            <Typography variant="body2">
              Remove face coverings, eyeglasses or masks.
            </Typography>
          </Box>
        </Box>
      </Box>

      {match && (
        <AuthenticatedProfile
          name={match.name}
          image={match.image}
          number={match.number}
        />
      )}
    </Box>
  );
};

export default FaceAuthentication;
