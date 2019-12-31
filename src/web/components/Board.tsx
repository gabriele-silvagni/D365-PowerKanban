import React, { useContext, useEffect, useState } from "react";
import { Navbar, Nav, Button, Card, Col, Row, DropdownButton, Dropdown, FormControl } from "react-bootstrap";
import WebApiClient from "xrm-webapi-client";
import { BoardViewConfig } from "../domain/BoardViewConfig";
import UserInputModal from "./UserInputModalProps";
import { AppStateProps, Dispatch, useAppContext } from "../domain/AppState";
import { formatGuid } from "../domain/GuidFormatter";
import { Lane } from "./Lane";
import { Metadata, Attribute, Option } from "../domain/Metadata";
import { BoardLane } from "../domain/BoardLane";
import { SavedQuery } from "../domain/SavedQuery";
import { CardForm } from "../domain/CardForm";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { fetchData } from "../domain/fetchData";

const determineAttributeUrl = (attribute: Attribute) => {
  if (attribute.AttributeType === "Picklist") {
    return "Microsoft.Dynamics.CRM.PicklistAttributeMetadata";
  }

  if (attribute.AttributeType === "Status") {
    return "Microsoft.Dynamics.CRM.StatusAttributeMetadata";
  }

  if (attribute.AttributeType === "State") {
    return "Microsoft.Dynamics.CRM.StateAttributeMetadata";
  }

  if (attribute.AttributeType === "Boolean") {
    return "Microsoft.Dynamics.CRM.BooleanAttributeMetadata";
  }

  throw new Error(`Type ${attribute.AttributeType} is not allowed as swim lane separator.`);
};

const fetchSeparatorMetadata = async (entity: string, swimLaneSource: string, metadata: Metadata) => {
  const field = metadata.Attributes.find(a => a.LogicalName.toLowerCase() === swimLaneSource.toLowerCase());
  const typeUrl = determineAttributeUrl(field);

  const response: Attribute = await WebApiClient.Retrieve({entityName: "EntityDefinition", queryParams: `(LogicalName='${entity}')/Attributes(LogicalName='${field.LogicalName}')/${typeUrl}?$expand=OptionSet`});
  return response;
};

const fetchMetadata = async (entity: string) => {
  const response: Metadata = await WebApiClient.Retrieve({entityName: "EntityDefinition", queryParams: `(LogicalName='${entity}')?$expand=Attributes`});

  return response;
};

const fetchConfig = async (configId: string): Promise<BoardViewConfig> => {
  const config = await WebApiClient.Retrieve({overriddenSetName: "webresourceset", entityId: configId, queryParams: "?$select=content" });

  return JSON.parse(atob(config.content));
};



export const Board = () => {
  const [ appState, appDispatch ] = useAppContext();
  const [ views, setViews ]: [ Array<SavedQuery>, (views: Array<SavedQuery>) => void ] = useState([]);
  const [ cardForms, setCardForms ]: [Array<CardForm>, (forms: Array<CardForm>) => void ] = useState([]);
  const [ showDeletionVerification, setShowDeletionVerification ] = useState(false);
  const [ stateFilters, setStateFilters ]: [Array<Option>, (options: Array<Option>) => void] = useState([]);

  useEffect(() => {
    async function initializeConfig() {
      const userId = formatGuid(Xrm.Page.context.getUserId());

      appDispatch({ type: "setProgressText", payload: "Retrieving user settings" });

      const user = await WebApiClient.Retrieve({ entityName: "systemuser", entityId: userId, queryParams: "?$select=oss_defaultboardid"});

      appDispatch({ type: "setProgressText", payload: "Fetching configuration" });

      const config = await fetchConfig(user.oss_defaultboardid);

      appDispatch({ type: "setProgressText", payload: "Fetching meta data" });

      const metadata = await fetchMetadata(config.entityName);
      const attributeMetadata = await fetchSeparatorMetadata(config.entityName, config.swimLaneSource, metadata);
      const stateMetadata = await fetchSeparatorMetadata(config.entityName, "statecode", metadata);

      appDispatch({ type: "setConfig", payload: config });
      appDispatch({ type: "setMetadata", payload: metadata });
      appDispatch({ type: "setSeparatorMetadata", payload: attributeMetadata });
      appDispatch({ type: "setStateMetadata", payload: stateMetadata });
      appDispatch({ type: "setProgressText", payload: "Fetching views" });

      const { value: views} = await WebApiClient.Retrieve({entityName: "savedquery", queryParams: `?$select=layoutxml,fetchxml,savedqueryid,name&$filter=returnedtypecode eq '${config.entityName}' and querytype eq 0`});
      setViews(views);

      const defaultView = views[0];

      appDispatch({ type: "setSelectedView", payload: defaultView });
      appDispatch({ type: "setProgressText", payload: "Fetching forms" });

      const { value: forms} = await WebApiClient.Retrieve({entityName: "systemform", queryParams: `?$select=formxml,name&$filter=objecttypecode eq 'incident' and type eq 11`});
      setCardForms(forms);

      const defaultForm = forms[0];

      appDispatch({ type: "setSelectedForm", payload: defaultForm });
      appDispatch({ type: "setProgressText", payload: "Fetching data" });

      const data = await fetchData(defaultView.fetchxml, config, attributeMetadata);

      appDispatch({ type: "setBoardData", payload: data });
      appDispatch({ type: "setProgressText", payload: undefined });
    }

    initializeConfig();
  }, []);

  const verifyDeletion = () => setShowDeletionVerification(true);
  const hideDeletionVerification = () => setShowDeletionVerification(false);

  const deleteRecord = () => {

  };

  const refresh = async (fetchXml?: string) => {
    appDispatch({ type: "setProgressText", payload: "Fetching data" });

    const data = await fetchData(fetchXml ?? appState.selectedView.fetchxml, appState.config, appState.separatorMetadata);

    appDispatch({ type: "setBoardData", payload: data });
    appDispatch({ type: "setProgressText", payload: undefined });
  };

  const newRecord = async () => {
    await Xrm.Navigation.openForm({ entityName: appState.config.entityName, useQuickCreateForm: true }, undefined);
    refresh();
  };

  const setView = (event: any) => {
    const viewId = event.target.id;
    const view = views.find(v => v.savedqueryid === viewId);

    appDispatch({ type: "setSelectedView", payload: view });
    refresh(view.fetchxml);
  };

  const setForm = (event: any) => {
    const formId = event.target.id;
    const form = cardForms.find(f => f.formid === formId);

    appDispatch({ type: "setSelectedForm", payload: form });
  };

  const setStateFilter = (event: any) => {
    const stateValue = event.target.id;

    if (stateFilters.some(f => f.Value == stateValue)) {
      setStateFilters(stateFilters.filter(f => f.Value != stateValue));
    }
    else {
      setStateFilters([...stateFilters, appState.stateMetadata.OptionSet.Options.find(o => o.Value == stateValue)]);
    }
  };

  return (
    <div style={{height: "100%"}}>
      <UserInputModal title="Verify Deletion" yesCallBack={deleteRecord} finally={hideDeletionVerification} show={showDeletionVerification}>
        <div>Are you sure you want to delete  '{appState.selectedRecord && appState.selectedRecord.name}' (ID: {appState.selectedRecord && appState.selectedRecord.id})?</div>
      </UserInputModal>
      <Navbar bg="light" variant="light" fixed="top">
        <Navbar.Collapse id="basic-navbar-nav" className="justify-content-between">
          <Nav className="pull-left">
            <DropdownButton id="viewSelector" title={appState.selectedView?.name ?? "Select view"}>
              { views?.map(v => <Dropdown.Item onClick={setView} as="button" id={v.savedqueryid} key={v.savedqueryid}>{v.name}</Dropdown.Item>) }
            </DropdownButton>
            <DropdownButton id="formSelector" title={appState.selectedForm?.name ?? "Select form"} style={{marginLeft: "5px"}}>
              { cardForms?.map(f => <Dropdown.Item onClick={setForm} as="button" id={f.formid} key={f.formid}>{f.name}</Dropdown.Item>) }
            </DropdownButton>
            { appState.config?.swimLaneSource === "statuscode" &&
              <DropdownButton id="formSelector" title={stateFilters.length ? stateFilters.map(f => f.Label.UserLocalizedLabel.Label).join("|") : "All states"} style={{marginLeft: "5px"}}>
                { appState.stateMetadata?.OptionSet.Options.map(o => <Dropdown.Item onClick={setStateFilter} as="button" id={o.Value} key={o.Value}>{o.Label.UserLocalizedLabel.Label}</Dropdown.Item>) }
              </DropdownButton>
            }
          </Nav>
          <Nav className="pull-right">
            { appState.config && appState.config.showCreateButton && <Button onClick={newRecord}>Create New</Button> }
            <Button style={{marginLeft: "5px"}} onClick={() => refresh()}>
              <FontAwesomeIcon icon="sync" />
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
      <div id="flexContainer" style={{ display: "flex", marginTop: "54px", flexDirection: "row", backgroundColor: "#efefef", overflow: "auto" }}>
        { appState.boardData && appState.boardData.filter(d => !stateFilters.length || stateFilters.some(f => f.Value === d.option.State)).map(d => <Lane key={`lane_${d.option?.Value ?? "fallback"}`} lane={d} />)}
      </div>
    </div>
  );
};
