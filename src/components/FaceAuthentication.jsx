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
        alignItems: "center",
        minHeight: "100vh", // Ensure the content fits within the viewport
        backgroundColor: "#ffffff", // Set background color to white
        flexDirection: "column",
        gap: 1, // Adjusted gap for better spacing
        padding: "10px", // Add padding to make sure content is spaced well
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          p: 5,
          borderRadius: "25px",
          backgroundColor: "#FAFAF5",
          boxShadow: 6,
          border: "2px solid lightgrey", // Thicker grey border
          width: "100%",
          maxWidth: "420px", // Makes the box more centered and responsive
          flex: 1, // Allow the content to fill the available space
          overflow: "hidden", // Prevent scrolling
        }}
      >
        {cameraError && (
          <Box
            sx={{
              padding: "10px",
              backgroundColor: "#ffebee",
              borderRadius: "8px",
              color: "red",
              marginBottom: "15px",
              textAlign: "center",
            }}
          >
            <Typography variant="body2">{cameraError}</Typography>
          </Box>
        )}

        {/* Only show webcam box if camera is accessible */}
        {!cameraError && (
          <Box
            sx={{
              position: "relative",
              width: "100%",
              height: "300px", // Set a fixed height for the webcam preview
              backgroundColor: "white",
              borderRadius: "18px",
              overflow: "hidden",
              boxShadow: 3,
              mb: 3, // Adjusted margin for spacing
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
                objectFit: "cover", // Ensures webcam fills the container
              }}
            />

            {/* Visual Border for Alignment */}
            <Box
              sx={{
                position: "absolute",
                top: "15%",
                left: "20%",
                right: "20%",
                bottom: "25%",
                border: "2px dashed #00C853", // Dashed border for alignment
                borderRadius: "12px",
                boxSizing: "border-box",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                pointerEvents: "none", // Prevent interaction with the border
              }}
            ></Box>
          </Box>
        )}

        <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            variant="body5"
            sx={{ flexShrink: 0, color: "#000", fontweight: "bold" }}
          >
            Enter Aadhaar Number:
          </Typography>
          <input
            type="text"
            value={aadhaarNumber}
            onChange={handleAadhaarChange}
            placeholder="XXXX XXXX XXXX"
            style={{
              padding: "5px",
              fontSize: "18px",
              width: "60%",
              borderRadius: "8px",
              border: "1px solid gray",
            }}
          />
        </Box>

        {/* Conditional Webcam and Authentication */}
        {isValidAadhaar && linkedFace && (
          <Box>
            <Typography variant="body5" sx={{ mb: 2, color: "#28a745" }}>
              Valid Aadhaar number Verified
            </Typography>
            {/* Your existing webcam and Authenticate button */}
          </Box>
        )}

        {/* Authentication Button */}
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
            borderRadius: "12px",
            width: "100%", // Takes up full width of the container
            maxWidth: "420px", // Limits the maximum width
            textTransform: "none",
            fontSize: "16px", // More readable font size
          }}
        >
          {isAuthenticating ? "Authenticating..." : "Authenticate"}
        </Button>

        {/* Parent container to hold both status boxes side by side */}
        <Box
          sx={{
            mt: 3,
            display: "flex",
            flexDirection: "row", // Arrange children in a row (side by side)
            alignItems: "center", // Align items vertically centered
            gap: 2, // Add spacing between the boxes
            width: "100%", // Ensure boxes don't shrink if there is enough space
            justifyContent: "space-evenly", // Spread them evenly across the available space
          }}
        >
          {/* Faces Detection Status */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              border: "2px solid", // Add border
              borderColor:
                facesStatus === "no-face"
                  ? "red"
                  : facesStatus === "multiple-faces"
                  ? "orange"
                  : "#00e500", // Dynamic border color based on facesStatus
              borderRadius: "8px", // Rounded corners
              padding: "8px", // Padding inside the box
              backgroundColor: "rgba(0, 0, 0, 0.1)", // Transparent background
              transition: "border-color 0.3s ease", // Smooth transition for color change
              flex: 1, // Makes the boxes responsive and evenly distributed
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

          {/* Face Matcher Loading Status */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              border: "2px solid", // Add border
              borderColor: isFaceMatcherLoaded ? "#00e500" : "orange", // Dynamic border color
              borderRadius: "8px", // Rounded corners
              padding: "8px", // Add some padding inside the border box
              backgroundColor: "rgba(0, 0, 0, 0.1)", // Transparent background
              transition: "border-color 0.3s ease", // Smooth transition for color change
              flex: 1, // Makes the boxes responsive and evenly distributed
            }}
          >
            {!isFaceMatcherLoaded && (
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
            {isFaceMatcherLoaded && (
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
            )}
          </Box>
        </Box>

        {/* Instructional Section */}
        <Box sx={{ mt: 4, width: "100%" }}>
          <Typography variant="h6" sx={{ mb: 2, textAlign: "start" }}>
            Follow these instructions:
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column", // Stack icons and texts vertically
              alignItems: "flex-start", // Align items to the start (left)
              gap: 1, // Reduced gap to make instructions closer together
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "row", // Align icon and text horizontally
                alignItems: "center", // Align icon and text vertically centered
                color: instructions.camera ? "green" : "green",
                mb: 1, // Reduced margin at the bottom to make it closer
              }}
            >
              <RemoveRedEyeIcon
                sx={{ color: instructions.camera ? "green" : "green" }}
              />
              <Typography variant="body5" sx={{ ml: 2 }}>
                Look directly at your camera and stay still
              </Typography>
            </Box>

            {/* New instruction for alignment */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "row", // Align icon and text horizontally
                alignItems: "center", // Align icon and text vertically centered
                color: instructions.camera ? "green" : "green",
                mb: 1, // Reduced margin
              }}
            >
              <CheckCircleIcon
                sx={{ color: instructions.camera ? "green" : "green" }}
              />
              <Typography variant="body5" sx={{ ml: 2 }}>
                Position your face within the green frame
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: "row", // Align icon and text horizontally
                alignItems: "center", // Align icon and text vertically centered
                color: instructions.lighting ? "green" : "green",
                mb: 1, // Reduced margin
              }}
            >
              <LightModeIcon
                sx={{ color: instructions.lighting ? "green" : "green" }}
              />
              <Typography variant="body5" sx={{ ml: 2 }}>
                Ensure good lighting on your face
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "row", // Align icon and text horizontally
                alignItems: "center", // Align icon and text vertically centered
                color: instructions.lighting ? "green" : "green",
                mb: 1, // Reduced margin
              }}
            >
              <VisibilityOffIcon
                sx={{ color: instructions.lighting ? "green" : "green" }}
              />
              <Typography variant="body5" sx={{ ml: 2 }}>
                Remove any face coverings, eyeglasses and masks
              </Typography>
            </Box>
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
