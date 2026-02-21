import ThreadView from "./components/ThreadView";

function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#121212",
        color: "#ffffff",
        padding: "2rem",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto"
        }}
      >
        <h1 style={{ marginBottom: "1.5rem" }}>
          Reddit AI Debate Analyzer
        </h1>

        <ThreadView />
      </div>
    </div>
  );
}

export default App;
