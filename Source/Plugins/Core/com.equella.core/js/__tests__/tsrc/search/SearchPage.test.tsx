/*
 * Licensed to The Apereo Foundation under one or more contributor license
 * agreements. See the NOTICE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 * The Apereo Foundation licenses this file to you under the Apache License,
 * Version 2.0, (the "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { createMuiTheme, MuiThemeProvider } from "@material-ui/core";
import type { Theme } from "@material-ui/core/styles";
import * as OEQ from "@openequella/rest-api-client";
import "@testing-library/jest-dom/extend-expect";
import {
  fireEvent,
  getByText,
  render,
  RenderResult,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryHistory } from "history";
import * as React from "react";
import { act } from "react-dom/test-utils";
import { Router } from "react-router-dom";
import { getAdvancedSearchesFromServerResult } from "../../../__mocks__/AdvancedSearchModule.mock";
import * as CategorySelectorMock from "../../../__mocks__/CategorySelector.mock";
import { getCollectionMap } from "../../../__mocks__/getCollectionsResp";
import { getRemoteSearchesFromServerResult } from "../../../__mocks__/RemoteSearchModule.mock";
import {
  getEmptySearchResult,
  getSearchResult,
  getSearchResultsCustom,
} from "../../../__mocks__/SearchResult.mock";
import * as UserSearchMock from "../../../__mocks__/UserSearch.mock";
import * as AdvancedSearchModule from "../../../tsrc/modules/AdvancedSearchModule";
import * as CollectionsModule from "../../../tsrc/modules/CollectionsModule";
import { Collection } from "../../../tsrc/modules/CollectionsModule";
import { getGlobalCourseList } from "../../../tsrc/modules/LegacySelectionSessionModule";
import * as MimeTypesModule from "../../../tsrc/modules/MimeTypesModule";
import * as RemoteSearchModule from "../../../tsrc/modules/RemoteSearchModule";
import type { SelectedCategories } from "../../../tsrc/modules/SearchFacetsModule";
import * as SearchFacetsModule from "../../../tsrc/modules/SearchFacetsModule";
import * as SearchModule from "../../../tsrc/modules/SearchModule";
import {
  liveStatuses,
  nonLiveStatuses,
} from "../../../tsrc/modules/SearchModule";
import * as SearchSettingsModule from "../../../tsrc/modules/SearchSettingsModule";
import * as UserModule from "../../../tsrc/modules/UserModule";
import SearchPage, { SearchPageOptions } from "../../../tsrc/search/SearchPage";
import { languageStrings } from "../../../tsrc/util/langstrings";
import { updateMockGetBaseUrl } from "../BaseUrlHelper";
import { queryPaginatorControls } from "../components/SearchPaginationTestHelper";
import { updateMockGlobalCourseList } from "../CourseListHelper";
import { selectOption } from "../MuiTestHelpers";
import { basicRenderData, updateMockGetRenderData } from "../RenderDataHelper";
import {
  clearSelection,
  selectUser,
} from "./components/OwnerSelectTestHelpers";
import {
  getRefineSearchComponent,
  queryCollectionSelector,
  queryDateRangeSelector,
  queryOwnerSelector,
  querySearchAttachmentsSelector,
  queryStatusSelector,
} from "./SearchPageHelper";

const defaultTheme = createMuiTheme({
  props: { MuiWithWidth: { initialWidth: "md" } },
});
const mockCollections = jest.spyOn(CollectionsModule, "collectionListSummary");
const mockListUsers = jest.spyOn(UserModule, "listUsers");
const mockListClassification = jest.spyOn(
  SearchFacetsModule,
  "listClassifications"
);
const mockSearch = jest.spyOn(SearchModule, "searchItems");
const mockSearchSettings = jest.spyOn(
  SearchSettingsModule,
  "getSearchSettingsFromServer"
);
const mockConvertParamsToSearchOptions = jest.spyOn(
  SearchModule,
  "queryStringParamsToSearchOptions"
);
//i tried mocking this using window.navigator.clipboard.writeText = jest.fn(), but the navigator object is undefined
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});
window.scrollTo = jest.fn();

const searchSettingPromise = mockSearchSettings.mockResolvedValue(
  SearchSettingsModule.defaultSearchSettings
);
const searchPromise = mockSearch.mockResolvedValue(getSearchResult);
mockCollections.mockResolvedValue(getCollectionMap);
mockListUsers.mockResolvedValue(UserSearchMock.users);
mockListClassification.mockResolvedValue(CategorySelectorMock.classifications);

// Mock out a collaborator of SearchResult
jest
  .spyOn(MimeTypesModule, "getMimeTypeDefaultViewerDetails")
  .mockResolvedValue({
    viewerId: "fancy",
  } as OEQ.MimeType.MimeTypeViewerDetail);

// Mock out collaborator which populates the Remote Search selector
jest
  .spyOn(RemoteSearchModule, "getRemoteSearchesFromServer")
  .mockResolvedValue(getRemoteSearchesFromServerResult);

// Mock out collaborator which populates the Advanced Search selector
jest
  .spyOn(AdvancedSearchModule, "getAdvancedSearchesFromServer")
  .mockResolvedValue(getAdvancedSearchesFromServerResult);

const defaultSearchPageOptions: SearchPageOptions = {
  ...SearchModule.defaultSearchOptions,
  sortOrder: "RANK",
  dateRangeQuickModeEnabled: true,
};
const defaultCollectionPrivileges = [OEQ.Acl.ACL_SEARCH_COLLECTION];

const SORTORDER_SELECT_ID = "#sort-order-select";
/**
 * Simple helper to wrap the process of waiting for the execution of a search based on checking the
 * `searchPromise`. Being that it is abstracted out, in the future could change as needed to be
 * something other than the `searchPromise`.
 */
const waitForSearch = async () =>
  await act(async () => {
    await searchPromise;
  });

/**
 * Helper function for the initial render of the `<SearchPage>` for tests below. Also includes
 * the wait for the initial search call.
 *
 * @returns The RenderResult from the `render` of the `<SearchPage>`
 */
const renderSearchPage = async (
  queryString?: string,
  theme: Theme = defaultTheme
): Promise<RenderResult> => {
  window.history.replaceState({}, "Clean history state");
  const history = createMemoryHistory();
  if (queryString) history.push(queryString);
  history.push({});

  const page = render(
    <MuiThemeProvider theme={theme}>
      <Router history={history}>
        <SearchPage updateTemplate={jest.fn()} />
      </Router>
    </MuiThemeProvider>
  );
  // Wait for the first completion of initial search
  await waitForSearch();

  return page;
};

/**
 * Helper function to unmount current Search page and re-render Search page.
 * @param page Current Search page.
 */
const reRenderSearchPage = async (page: RenderResult) => {
  page.unmount();
  return await renderSearchPage();
};

const getQueryBar = (container: Element): HTMLElement => {
  const queryBar = container.querySelector<HTMLElement>("#searchBar");
  if (!queryBar) {
    throw new Error("Failed to locate the search bar, unable to continue.");
  }

  return queryBar;
};

const changeQuery = async (
  container: Element,
  query: string,
  rawMode?: boolean
) => {
  // We will change the debounced query so use fake timer here.
  jest.useFakeTimers("modern");
  // Change search options now.
  if (rawMode) {
    const rawModeSwitch = container.querySelector("#rawSearch");
    if (!rawModeSwitch) {
      throw new Error("Failed to find the raw mode switch!");
    }
    userEvent.click(rawModeSwitch);
  }
  const _queryBar = () => getQueryBar(container);
  // Would be nice to replace this with a userEvent.type like:
  //   await act(async () => await userEvent.type(_queryBar(), query, {delay: 1}));
  // But initial attempts failed - even with adding a delay (which then caused a Jest timeout).
  fireEvent.change(_queryBar(), { target: { value: query } });
  await waitFor(() => {
    expect(_queryBar()).toHaveDisplayValue(query);
    jest.advanceTimersByTime(1000);
  });
};

const clickCategory = (container: HTMLElement, category: string) => {
  userEvent.click(getByText(container, category));
};

describe("Refine search by searching attachments", () => {
  let page: RenderResult;

  beforeEach(async () => {
    page = await renderSearchPage();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const getSearchAttachmentsSelector = (container: Element): HTMLElement =>
    getRefineSearchComponent(container, "SearchAttachmentsSelector");
  const changeOption = (selector: HTMLElement, option: string) =>
    fireEvent.click(getByText(selector, option));
  const { yes: yesLabel, no: noLabel } = languageStrings.common.action;

  it("Should default to searching attachments", async () => {
    expect(mockSearch).toHaveBeenLastCalledWith(defaultSearchPageOptions);
  });

  it("Should not search attachments if No is selected", async () => {
    changeOption(getSearchAttachmentsSelector(page.container), noLabel);
    await waitForSearch();
    expect(mockSearch).toHaveBeenLastCalledWith({
      ...defaultSearchPageOptions,
      searchAttachments: false,
    });
  });

  it("Should search attachments if Yes is selected", async () => {
    changeOption(getSearchAttachmentsSelector(page.container), yesLabel);
    await waitForSearch();
    expect(mockSearch).toHaveBeenLastCalledWith(defaultSearchPageOptions);
  });
});

describe("Refine search by status", () => {
  const {
    live: liveButtonLabel,
    all: allButtonLabel,
  } = languageStrings.searchpage.statusSelector;

  const expectSearchItemsCalledWithStatus = (status: OEQ.Common.ItemStatus[]) =>
    expect(mockSearch).toHaveBeenLastCalledWith({
      ...defaultSearchPageOptions,
      status: status,
    });

  const getStatusSelector = (container: Element): HTMLElement =>
    getRefineSearchComponent(container, "StatusSelector");

  const selectStatus = (container: Element, status: string) =>
    fireEvent.click(getByText(getStatusSelector(container), status));

  beforeEach(() => {
    // Status selector is disabled by default so enable it before test.
    searchSettingPromise.mockResolvedValueOnce({
      ...SearchSettingsModule.defaultSearchSettings,
      searchingShowNonLiveCheckbox: true,
    });
  });

  afterEach(() => {
    // Needed to keep Enzyme tests below happy
    jest.clearAllMocks();
  });

  it("Should default to LIVE statuses", async () => {
    await renderSearchPage();
    expectSearchItemsCalledWithStatus(liveStatuses);
  });

  it("Should search for items of all statuses if ALL is clicked", async () => {
    const page = await renderSearchPage();
    selectStatus(page.container, allButtonLabel);
    await waitForSearch();
    expectSearchItemsCalledWithStatus(liveStatuses.concat(nonLiveStatuses));
  });

  it("Should search for items of 'live' statuses if LIVE is clicked", async () => {
    const page = await renderSearchPage();
    selectStatus(page.container, liveButtonLabel);
    await waitForSearch();
    expectSearchItemsCalledWithStatus(liveStatuses);
  });
});

describe("Refine search by Owner", () => {
  const testUser = UserSearchMock.users[0];
  let page: RenderResult;

  beforeEach(async () => {
    page = await renderSearchPage();
  });

  afterEach(() => {
    // Needed to keep Enzyme tests below happy
    jest.clearAllMocks();
  });

  const getOwnerSelector = (container: Element): HTMLElement =>
    getRefineSearchComponent(container, "OwnerSelector");

  const confirmSelectedUser = (username: string) => screen.getByText(username);

  const confirmSelectedUserCleared = (username: string) => {
    let stillPresent = true;
    try {
      confirmSelectedUser(username);
    } catch {
      stillPresent = false;
    }
    if (stillPresent) {
      throw new Error("Can still see the username: " + username);
    }
  };

  const _selectUser = async (container: HTMLElement, username: string) => {
    await selectUser(getOwnerSelector(container), username);
    // The selected user will now be displayed
    await waitFor(() => confirmSelectedUser(username));
  };

  it("should be possible to set the owner", async () => {
    await _selectUser(page.container, testUser.username);

    expect(SearchModule.searchItems).toHaveBeenCalledWith({
      ...defaultSearchPageOptions,
      owner: testUser,
    });
  });

  it("should be possible to clear the owner filter", async () => {
    await _selectUser(page.container, testUser.username);

    // Now clear the selection
    clearSelection();
    await waitFor(() => confirmSelectedUserCleared(testUser.username));

    expect(SearchModule.searchItems).toHaveBeenCalledWith(
      defaultSearchPageOptions
    );
  });
});

describe("Collapsible refine filter section", () => {
  let page: RenderResult;
  beforeEach(async () => {
    page = await renderSearchPage();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Should contain the correct controls", async () => {
    const refineSearchPanel = page
      .getByText(languageStrings.searchpage.refineSearchPanel.title)
      .closest("div");
    if (!refineSearchPanel) {
      throw new Error("Unable to find refine search panel");
    }

    const collapsibleSection = refineSearchPanel.querySelector(
      ".collapsibleRefinePanel"
    );
    if (!collapsibleSection) {
      throw new Error(
        "Unable to find collapsible filter section inside refine search panel"
      );
    }

    expect(collapsibleSection).toContainElement(
      queryOwnerSelector(refineSearchPanel)
    );
    expect(collapsibleSection).toContainElement(
      queryDateRangeSelector(refineSearchPanel)
    );
    expect(collapsibleSection).toContainElement(
      querySearchAttachmentsSelector(refineSearchPanel)
    );
    expect(collapsibleSection).not.toContainElement(
      queryCollectionSelector(refineSearchPanel)
    );
  });

  it("Should change button text when clicked", async () => {
    const expansionButton = page.container.querySelector(
      "#collapsibleRefinePanelButton"
    );
    if (!expansionButton) {
      throw new Error("Unable to find collapsible refine panel button");
    }
    userEvent.click(expansionButton);
    expect(expansionButton).toHaveTextContent(
      languageStrings.common.action.showLess
    );
  });
});

describe("Hide Refine Search controls", () => {
  let page: RenderResult;
  beforeEach(async () => {
    page = await renderSearchPage();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const _queryOwnerSelector = () => queryOwnerSelector(page.container);
  const _queryDateSelector = () => queryDateRangeSelector(page.container);
  const _queryStatusSelector = () => queryStatusSelector(page.container);
  const disableDateSelector = {
    ...SearchSettingsModule.defaultSearchSettings,
    searchingDisableDateModifiedFilter: true,
  };
  const disableOwnerSelector = {
    ...SearchSettingsModule.defaultSearchSettings,
    searchingDisableOwnerFilter: true,
  };
  const enableStatusSelector = {
    ...SearchSettingsModule.defaultSearchSettings,
    searchingShowNonLiveCheckbox: true,
  };

  it.each([
    // Reuse default Search settings as disableStatusSelector, enableOwnerSelector and enableDateSelector.
    [
      "Owner Selector",
      _queryOwnerSelector,
      disableOwnerSelector,
      SearchSettingsModule.defaultSearchSettings,
    ],
    [
      "Date Selector",
      _queryDateSelector,
      disableDateSelector,
      SearchSettingsModule.defaultSearchSettings,
    ],
    [
      "Status Selector",
      _queryStatusSelector,
      SearchSettingsModule.defaultSearchSettings,
      enableStatusSelector,
    ],
  ])(
    "should be possible to disable %s",
    async (
      testName: string,
      getSelector: () => HTMLElement | null,
      disableSelector: OEQ.SearchSettings.Settings,
      enableSelector: OEQ.SearchSettings.Settings
    ) => {
      // Explicitly enable selectors.
      searchSettingPromise.mockResolvedValueOnce(enableSelector);
      page = await reRenderSearchPage(page);
      expect(getSelector()).toBeInTheDocument();
      // Now disable them and re-render the page.
      searchSettingPromise.mockResolvedValueOnce(disableSelector);
      page = await reRenderSearchPage(page);
      // They should disappear.
      expect(getSelector()).toBeNull();
    }
  );
});

describe("<SearchPage/>", () => {
  const JAVA_CATEGORY = "java";
  const selectedCategories: SelectedCategories[] = [
    { id: 766942, schemaNode: "/item/language", categories: [JAVA_CATEGORY] },
  ];

  let page: RenderResult;
  beforeEach(async () => {
    page = await renderSearchPage();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should clear search options and perform a new search", async () => {
    const { container } = page;
    const query = "clear query";
    const sortingDropdown = screen.getByDisplayValue("RANK");
    const newSearchButton = screen.getByText(
      languageStrings.searchpage.newSearch
    );

    // Change the defaults
    await changeQuery(container, query);
    await waitForSearch();
    selectOption(
      container,
      "#sort-order-select",
      languageStrings.settings.searching.searchPageSettings.title
    );
    await waitForSearch();

    // Perform a new search and check.
    fireEvent.click(newSearchButton);
    await waitFor(() => {
      expect(sortingDropdown).toHaveValue("RANK");
      expect(getQueryBar(container)).toHaveValue("");
    });
    // Four searches have been performed: initial search, one for query change and
    // one for sorting change, and one for clearing.
    expect(SearchModule.searchItems).toHaveBeenCalledTimes(4);
    expect(SearchModule.searchItems).toHaveBeenLastCalledWith(
      defaultSearchPageOptions
    );
  });

  it("should retrieve search settings and collections, and do a search when the page is opened", () => {
    expect(
      SearchSettingsModule.getSearchSettingsFromServer
    ).toHaveBeenCalledTimes(1);
    expect(SearchModule.searchItems).toHaveBeenCalledTimes(1);
    expect(SearchModule.searchItems).toHaveBeenCalledWith(
      defaultSearchPageOptions
    );
    expect(CollectionsModule.collectionListSummary).toHaveBeenCalledTimes(1);
    expect(CollectionsModule.collectionListSummary).toHaveBeenCalledWith(
      defaultCollectionPrivileges
    );
  });

  it("should support debounce query search and display search results", async () => {
    await changeQuery(page.container, "new query");
    // After 1s the second search should be triggered. (The first being the initial component mount.)
    expect(SearchModule.searchItems).toHaveBeenCalledTimes(2);
    expect(SearchModule.searchItems).toHaveBeenCalledWith({
      ...defaultSearchPageOptions,
      query: "new query",
    });
    expect(page.container).toHaveTextContent(
      "266bb0ff-a730-4658-aec0-c68bbefc227c"
    );
    expect(page.container).not.toHaveTextContent("No results found."); // Should be the lang string
  });

  it("should display 'No results found.' when there are no search results", async () => {
    mockSearch.mockImplementationOnce(() =>
      Promise.resolve(getEmptySearchResult)
    );
    await changeQuery(page.container, "no items");
    expect(page.container).toHaveTextContent("No results found."); // Should be the lang string
  });

  it("should support changing the number of items displayed per page", async () => {
    // Initial items per page is 10
    const {
      getPageCount,
      getItemsPerPageOption,
      getItemsPerPageSelect,
    } = queryPaginatorControls(page.container);
    expect(getPageCount()).toHaveTextContent("1-10 of 12");

    userEvent.click(getItemsPerPageSelect());
    const itemsPerPageDesired = 25;
    userEvent.click(getItemsPerPageOption(itemsPerPageDesired));

    await waitForSearch();
    expect(SearchModule.searchItems).toHaveBeenCalledWith({
      ...defaultSearchPageOptions,
      rowsPerPage: itemsPerPageDesired,
    });
    expect(getPageCount()).toHaveTextContent("1-12 of 12");
  });

  it("navigates to the previous and next page when requested", async () => {
    const {
      getNextPageButton,
      getPageCount,
      getPreviousPageButton,
    } = queryPaginatorControls(page.container);

    userEvent.click(getNextPageButton());
    await waitForSearch();
    expect(getPageCount()).toHaveTextContent("11-12 of 12");

    userEvent.click(getPreviousPageButton());
    await waitForSearch();
    expect(getPageCount()).toHaveTextContent("1-10 of 12");
  });

  it("moves to the first and last page when requested", async () => {
    mockSearch.mockImplementation(() =>
      Promise.resolve(getSearchResultsCustom(30))
    );
    const {
      getFirstPageButton,
      getLastPageButton,
      getPageCount,
    } = queryPaginatorControls(page.container);
    const firstPageCountText = "1-10 of 30";

    // ensure baseline
    await changeQuery(page.container, "baseline");
    expect(getPageCount()).toHaveTextContent(firstPageCountText);

    // Test going to the last page
    userEvent.click(getLastPageButton());
    await waitForSearch();
    expect(getPageCount()).toHaveTextContent("21-30 of 30");

    // ... and now back to the first
    userEvent.click(getFirstPageButton());
    await waitForSearch();
    expect(getPageCount()).toHaveTextContent(firstPageCountText);
  });

  it("sort search results based on selection", async () => {
    selectOption(
      page.container,
      SORTORDER_SELECT_ID,
      languageStrings.settings.searching.searchPageSettings.lastModified
    );
    await waitForSearch();

    // Because sorting is done on the server-side and we are using mock data, we can only check if the selected
    // sort order is included in the search params
    expect(SearchModule.searchItems).toHaveBeenCalledWith({
      ...defaultSearchPageOptions,
      sortOrder: "DATEMODIFIED",
    });
  });

  it("sends the query as-is when in raw search mode", async () => {
    // When a raw mode search is done
    await changeQuery(page.container, "raw search test", true);
    await waitForSearch();

    // assert that the query was passed in as-is
    expect(SearchModule.searchItems).toHaveBeenLastCalledWith({
      ...defaultSearchPageOptions,
      rawMode: true,
      query: "raw search test",
    });
    // There should be three calls:
    // 1. The initial call on component mount
    // 2. Switching to raw mode
    // 3. Typing a query, and hitting enter
    expect(SearchModule.searchItems).toHaveBeenCalledTimes(3);
  });

  it("filters by date range derived from 'Quick Options'", async () => {
    selectOption(page.container, "#date_range_selector", "Today");
    await waitForSearch();

    expect(SearchModule.searchItems).toHaveBeenLastCalledWith({
      ...defaultSearchPageOptions,
      lastModifiedDateRange: {
        start: new Date(), // i.e. Today as per the quick option
        end: undefined,
      },
    });
  });

  it("filters by selected collection", async () => {
    const targetCollection: Collection = getCollectionMap[0];
    userEvent.click(
      page.getByLabelText(languageStrings.searchpage.collectionSelector.title)
    );
    userEvent.click(screen.getByText(targetCollection.name));
    await waitForSearch();

    expect(SearchModule.searchItems).toHaveBeenCalledTimes(2);
    expect(SearchModule.searchItems).toHaveBeenLastCalledWith({
      ...defaultSearchPageOptions,
      collections: [targetCollection],
    });
  });

  it("should search with selected Categories", async () => {
    clickCategory(page.container, JAVA_CATEGORY);
    await waitForSearch();
    expect(SearchModule.searchItems).toHaveBeenLastCalledWith({
      ...defaultSearchPageOptions,
      selectedCategories: selectedCategories,
    });
  });

  it("should also update Classification list with selected categories", async () => {
    clickCategory(page.container, JAVA_CATEGORY);
    await waitForSearch(); // The intention of this line is to avoid Jest act warning.
    expect(SearchFacetsModule.listClassifications).toHaveBeenLastCalledWith({
      ...defaultSearchPageOptions,
      selectedCategories: selectedCategories,
    });
  });

  it("should copy a search link to clipboard, and show a snackbar", async () => {
    const mockClipboard = jest.spyOn(navigator.clipboard, "writeText");
    const copySearchButton = screen.getByTitle(
      languageStrings.searchpage.shareSearchHelperText
    );
    mockClipboard.mockResolvedValueOnce();
    await act(async () => {
      copySearchButton.click();
    });
    expect(SearchModule.queryStringParamsToSearchOptions).toHaveBeenCalledTimes(
      1
    );
    expect(mockClipboard).toHaveBeenCalledWith(
      "/?searchOptions=%7B%22rowsPerPage%22%3A10%2C%22currentPage%22%3A0%2C%22sortOrder%22%3A%22RANK%22%2C%22rawMode%22%3Afalse%2C%22status%22%3A%5B%22LIVE%22%2C%22REVIEW%22%5D%2C%22searchAttachments%22%3Atrue%2C%22query%22%3A%22%22%2C%22collections%22%3A%5B%5D%2C%22lastModifiedDateRange%22%3A%7B%7D%2C%22dateRangeQuickModeEnabled%22%3Atrue%7D"
    );
    expect(
      screen.getByText(languageStrings.searchpage.shareSearchConfirmationText)
    ).toBeInTheDocument();
  });
});

describe("conversion of parameters to SearchPageOptions", () => {
  const searchPageOptions: SearchPageOptions = {
    ...defaultSearchPageOptions,
    dateRangeQuickModeEnabled: false,
  };

  beforeEach(() => {
    mockConvertParamsToSearchOptions.mockResolvedValueOnce(searchPageOptions);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should call queryStringParamsToSearchOptions using query paramaters in url", async () => {
    await renderSearchPage("?q=test");
    expect(SearchModule.queryStringParamsToSearchOptions).toHaveBeenCalledTimes(
      1
    );
  });
});

describe("In Selection Session", () => {
  beforeAll(() => {
    updateMockGlobalCourseList();
    updateMockGetBaseUrl();
  });

  it("should make each Search result Item draggable", async () => {
    updateMockGetRenderData(basicRenderData);
    mockSearch.mockResolvedValue(getSearchResult);
    await renderSearchPage();

    const searchResults = getSearchResult.results;
    // Make sure the search result definitely has Items.
    expect(searchResults.length).toBeGreaterThan(0);

    searchResults.forEach(({ uuid }) => {
      expect(
        getGlobalCourseList().prepareDraggableAndBind
      ).toHaveBeenCalledWith(`#${uuid}`, true);
    });
  });

  it("should not show the share search button", async () => {
    updateMockGetRenderData(basicRenderData);
    mockSearch.mockResolvedValue(getSearchResult);
    const { queryByTitle } = await renderSearchPage();

    const copySearchButton = queryByTitle(
      languageStrings.searchpage.shareSearchHelperText
    );
    expect(copySearchButton).not.toBeInTheDocument();
  });
});

describe("Responsiveness", () => {
  const theme = createMuiTheme({
    props: { MuiWithWidth: { initialWidth: "sm" } },
  });

  // We can query the Refine Search Panel as it always exists in the Side Panel.
  const querySidePanel = (page: RenderResult) =>
    page.queryByText(languageStrings.searchpage.refineSearchPanel.title);
  let page: RenderResult;

  beforeEach(async () => {
    page = await renderSearchPage(undefined, theme);
  });

  it("should hide the side panel in small screens", async () => {
    expect(querySidePanel(page)).not.toBeInTheDocument();
  });

  it("should display the button controlling the side panel visibility", async () => {
    const refineSearchButton = page.queryByTitle(
      languageStrings.searchpage.refineSearchPanel.title
    );
    expect(refineSearchButton).toBeInTheDocument();
    await act(async () => {
      // Put this click in an act because it will update some components' state.
      await userEvent.click(refineSearchButton!); // It's safe to add a '!' now.
    });
    expect(querySidePanel(page)).toBeInTheDocument();
  });
});
