import * as React from "react";
import { useAppContext } from "../domain/AppState";
import { PrimaryButton, IconButton } from "@fluentui/react/lib/Button";

import { refresh } from "../domain/fetchData";
import { useActionDispatch, useActionContext } from "../domain/ActionState";
import { useConfigDispatch, useConfigState } from "../domain/ConfigState";

interface FormProps {
}

export const SideBySideForm = (props: FormProps) => {
  const [appState, appDispatch] = useAppContext();
  const [actionState, actionDispatch] = useActionContext();
  const configState = useConfigState();

  const closeSideBySide = () => {
    actionDispatch({ type: "setSelectedRecord", payload: undefined });
  };

  const closeAndRefresh = async () => {
    actionDispatch({ type: "setSelectedRecord", payload: undefined });

    await refresh(appDispatch, appState, configState, actionDispatch, actionState);
  };

  const openInNewTab = () => {
    Xrm.Navigation.openForm({ entityName: actionState.selectedRecord.entityType, entityId: actionState.selectedRecord.id, openInNewWindow: true });
  };

  return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <IconButton iconProps={{iconName: "ChromeClose"}} title="Close" onClick={closeSideBySide} style={{ color: "white", backgroundColor: "#045999", position: "absolute", top: "calc(50% - 40px)", left: "-18px" }}></IconButton>
        <IconButton iconProps={{iconName: "Refresh"}} title="Close and refresh" onClick={closeAndRefresh} style={{ color: "white", backgroundColor: "#045999", position: "absolute", top: "50%", left: "-18px" }}></IconButton>
        <IconButton iconProps={{iconName: "OpenInNewWindow"}} title="Open in new window" onClick={openInNewTab} style={{ color: "white", backgroundColor: "#045999", position: "absolute", top: "calc(50% + 40px)", left: "-18px" }}></IconButton>
        <iframe style={{width: "100%", height: "100%", border: 0}} src={`/main.aspx?app=${configState.appId}&pagetype=entityrecord&navbar=off&etn=${actionState.selectedRecord.entityType}&id=${actionState.selectedRecord.id}`}></iframe>
      </div>
  );
};