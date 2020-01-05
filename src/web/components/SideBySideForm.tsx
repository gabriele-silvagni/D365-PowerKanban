import React, { useRef, useEffect } from "react";
import { useAppContext } from "../domain/AppState";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { fetchData } from "../domain/fetchData";

interface FormProps {
}

export const SideBySideForm = (props: FormProps) => {
  const [ appState, appDispatch ] = useAppContext();

  const _iframe = useRef(undefined);

  useEffect(() => {
    const style = document.createElement("style");
    style.type = "text/css";

    style.appendChild(document.createTextNode(`#id-5 { display: hidden; } [data-id="topBar"] { display: hidden; }`));

    _iframe.current.contentWindow.document.head.append(style);
  }, []);

  const closeSideBySide = () => {
    appDispatch({ type: "setSelectedRecord", payload: undefined });
  };

  const closeAndRefresh = async () => {
    appDispatch({ type: "setSelectedRecord", payload: undefined });
    appDispatch({ type: "setProgressText", payload: "Fetching data" });

    const data = await fetchData(appState.config.entityName, appState.selectedView.fetchxml, appState.config.swimLaneSource, appState.selectedForm, appState.metadata, appState.separatorMetadata);

    appDispatch({ type: "setBoardData", payload: data });
    appDispatch({ type: "setProgressText", payload: undefined });
  };

  const openInNewTab = () => {
    Xrm.Navigation.openForm({ entityName: appState.selectedRecord.entityType, entityId: appState.selectedRecord.id, openInNewWindow: true });
  };

  // Todo:
  // Hide Navbar, sidebar with css in Iframe
  // Elements to hide
  // id="id-5"
  // data-id="topBar"

  return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <Button onClick={closeSideBySide} style={{ position: "absolute", top: "45%", left: "-18px" }}><FontAwesomeIcon icon="window-close" /></Button>
        <Button onClick={closeAndRefresh} style={{ position: "absolute", top: "50%", left: "-18px" }}><FontAwesomeIcon icon="sync" /></Button>
        <Button onClick={openInNewTab} style={{ position: "absolute", top: "55%", left: "-18px" }}><FontAwesomeIcon icon="window-maximize" /></Button>
        <iframe srcDoc="" ref={_iframe} style={{width: "100%", height: "100%", border: 0}} src={`/main.aspx?appid=${appState.appId}&pagetype=entityrecord&etn=${appState.selectedRecord.entityType}&id=${appState.selectedRecord.id}`}></iframe>
      </div>
  );
};