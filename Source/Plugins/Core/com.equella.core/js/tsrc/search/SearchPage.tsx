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
import { Drawer, Grid, Hidden } from "@material-ui/core";
import * as OEQ from "@openequella/rest-api-client";

import { isEqual } from "lodash";
import * as React from "react";
import { useCallback, useEffect, useReducer, useState } from "react";
import { useHistory, useLocation } from "react-router";
import { generateFromError } from "../api/errors";
import { AppConfig } from "../AppConfig";
import { DateRangeSelector } from "../components/DateRangeSelector";
import MessageInfo from "../components/MessageInfo";
import { routes } from "../mainui/routes";
import {
  templateDefaults,
  templateError,
  TemplateUpdateProps,
} from "../mainui/Template";
import { getAdvancedSearchesFromServer } from "../modules/AdvancedSearchModule";
import type { Collection } from "../modules/CollectionsModule";
import {
  buildSelectionSessionAdvancedSearchLink,
  buildSelectionSessionRemoteSearchLink,
  isSelectionSessionInStructured,
  prepareDraggable,
} from "../modules/LegacySelectionSessionModule";
import { getRemoteSearchesFromServer } from "../modules/RemoteSearchModule";
import {
  Classification,
  listClassifications,
  SelectedCategories,
} from "../modules/SearchFacetsModule";
import {
  DateRange,
  defaultPagedSearchResult,
  defaultSearchOptions,
  generateQueryStringFromSearchOptions,
  getPartialSearchOptions,
  queryStringParamsToSearchOptions,
  searchItems,
  SearchOptions,
  SearchOptionsFields,
} from "../modules/SearchModule";
import { getSearchSettingsFromServer } from "../modules/SearchSettingsModule";
import SearchBar from "../search/components/SearchBar";
import { languageStrings } from "../util/langstrings";
import { AuxiliarySearchSelector } from "./components/AuxiliarySearchSelector";
import { CollectionSelector } from "./components/CollectionSelector";
import OwnerSelector from "./components/OwnerSelector";
import { RefinePanelControl } from "./components/RefineSearchPanel";
import { SearchAttachmentsSelector } from "./components/SearchAttachmentsSelector";
import {
  mapSearchResultItems,
  SearchResultList,
} from "./components/SearchResultList";
import { SidePanel } from "./components/SidePanel";
import StatusSelector from "./components/StatusSelector";

// destructure strings import
const { searchpage: searchStrings } = languageStrings;
const {
  title: dateModifiedSelectorTitle,
  quickOptionDropdown,
} = searchStrings.lastModifiedDateSelector;
const { title: collectionSelectorTitle } = searchStrings.collectionSelector;

/**
 * Type of search options that are specific to Search page presentation layer.
 */
export interface SearchPageOptions extends SearchOptions {
  /**
   * Whether to enable Quick mode (true) or to use custom date pickers (false).
   */
  dateRangeQuickModeEnabled: boolean;
}

/**
 * Structure of data stored in browser history state, to capture the current state of SearchPage
 */
interface SearchPageHistoryState {
  /**
   * SearchPageOptions to store in history
   */
  searchPageOptions: SearchPageOptions;
  /**
   * Open/closed state of refine expansion panel
   */
  filterExpansion: boolean;
}

type Action =
  | { type: "init" }
  | { type: "search"; options: SearchPageOptions; scrollToTop: boolean }
  | {
      type: "search-complete";
      result: OEQ.Search.SearchResult<OEQ.Search.SearchResultItem>;
      classifications: Classification[];
    }
  | { type: "error"; cause: Error };

type State =
  | { status: "initialising" }
  | {
      status: "searching";
      options: SearchPageOptions;
      previousResult?: OEQ.Search.SearchResult<OEQ.Search.SearchResultItem>;
      previousClassifications?: Classification[];
      scrollToTop: boolean;
    }
  | {
      status: "success";
      result: OEQ.Search.SearchResult<OEQ.Search.SearchResultItem>;
      classifications: Classification[];
    }
  | { status: "failure"; cause: Error };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "init":
      return { status: "initialising" };
    case "search":
      const prevResults =
        state.status === "success"
          ? {
              previousResult: state.result,
              previousClassifications: state.classifications,
            }
          : {};
      return {
        status: "searching",
        options: action.options,
        scrollToTop: action.scrollToTop,
        ...prevResults,
      };
    case "search-complete":
      return {
        status: "success",
        result: action.result,
        classifications: action.classifications,
      };
    case "error":
      return { status: "failure", cause: action.cause };
    default:
      throw new TypeError("Unexpected action passed to reducer!");
  }
};

const SearchPage = ({ updateTemplate }: TemplateUpdateProps) => {
  const history = useHistory();
  const location = useLocation();

  const [state, dispatch] = useReducer(reducer, { status: "initialising" });
  const defaultSearchPageOptions: SearchPageOptions = {
    ...defaultSearchOptions,
    dateRangeQuickModeEnabled: true,
  };

  const defaultSearchPageHistory: SearchPageHistoryState = {
    searchPageOptions: defaultSearchPageOptions,
    filterExpansion: false,
  };
  const searchPageHistoryState: SearchPageHistoryState | undefined = history
    .location.state as SearchPageHistoryState;
  const [searchPageOptions, setSearchPageOptions] = useState<SearchPageOptions>(
    // If the user has gone 'back' to this page, then use their previous options. Otherwise
    // we start fresh - i.e. if a new navigation to Search Page.
    searchPageHistoryState?.searchPageOptions ??
      defaultSearchPageHistory.searchPageOptions
  );
  const [filterExpansion, setFilterExpansion] = useState(
    searchPageHistoryState?.filterExpansion ??
      defaultSearchPageHistory.filterExpansion
  );
  const [
    showSearchCopiedSnackBar,
    setShowSearchCopiedSnackBar,
  ] = useState<boolean>(false);
  const [
    searchSettings,
    setSearchSettings,
  ] = useState<OEQ.SearchSettings.Settings>();

  const [showRefinePanel, setShowRefinePanel] = useState<boolean>(false);

  const handleError = useCallback(
    (error: Error) => {
      dispatch({ type: "error", cause: error });
    },
    [dispatch]
  );

  const search = useCallback(
    (searchPageOptions: SearchPageOptions, scrollToTop = true): void =>
      dispatch({
        type: "search",
        options: { ...searchPageOptions },
        scrollToTop,
      }),
    [dispatch]
  );

  /**
   * Error display -> similar to onError hook, however in the context of reducer need to do manually.
   */
  useEffect(() => {
    if (state.status === "failure") {
      updateTemplate(templateError(generateFromError(state.cause)));
    }
  }, [state, updateTemplate]);

  /**
   * Page initialisation -> Update the page title, retrieve Search settings and trigger first
   * search.
   */
  useEffect(() => {
    if (state.status !== "initialising") {
      return;
    }

    updateTemplate((tp) => ({
      ...templateDefaults(searchStrings.title)(tp),
    }));

    Promise.all([
      getSearchSettingsFromServer(),
      // If the search options are available from browser history, ignore those in the query string.
      (location.state as SearchPageHistoryState)
        ? Promise.resolve(undefined)
        : queryStringParamsToSearchOptions(location),
    ])
      .then(([searchSettings, queryStringSearchOptions]) => {
        setSearchSettings(searchSettings);
        search(
          queryStringSearchOptions
            ? {
                ...queryStringSearchOptions,
                dateRangeQuickModeEnabled: false,
                sortOrder:
                  queryStringSearchOptions.sortOrder ??
                  searchSettings.defaultSearchSort,
              }
            : {
                ...searchPageOptions,
                sortOrder:
                  searchPageOptions.sortOrder ??
                  searchSettings.defaultSearchSort,
              }
        );
      })
      .catch((e) => {
        handleError(e);
      });
  }, [
    dispatch,
    handleError,
    location,
    search,
    searchPageOptions,
    state.status,
    updateTemplate,
  ]);

  /**
   * Searching -> Executing the search (including for classifications) and returning the results.
   */
  useEffect(() => {
    if (state.status === "searching") {
      setSearchPageOptions(state.options);
      Promise.all([
        searchItems(state.options),
        listClassifications(state.options),
      ])
        .then(
          ([result, classifications]: [
            OEQ.Search.SearchResult<OEQ.Search.SearchResultItem>,
            Classification[]
          ]) => {
            dispatch({
              type: "search-complete",
              result: { ...result },
              classifications: [...classifications],
            });
            // Update history
            history.replace({
              ...history.location,
              state: { searchPageOptions: state.options, filterExpansion },
            });
            // scroll back up to the top of the page
            if (state.scrollToTop) window.scrollTo(0, 0);
          }
        )
        .catch(handleError);
    }
  }, [dispatch, filterExpansion, handleError, history, state]);

  // In Selection Session, once a new search result is returned, make each
  // new search result Item draggable. Could probably merge into 'searching'
  // effect, however this is only required while selection sessions still
  // involve legacy content.
  useEffect(() => {
    if (state.status === "success" && isSelectionSessionInStructured()) {
      state.result.results.forEach(({ uuid }) => {
        prepareDraggable(uuid);
      });
    }
  }, [state]);

  const handleSortOrderChanged = (order: OEQ.SearchSettings.SortOrder) =>
    search({ ...searchPageOptions, sortOrder: order });

  const handleQueryChanged = (query: string) =>
    search({
      ...searchPageOptions,
      query: query,
      currentPage: 0,
      selectedCategories: undefined,
    });

  const handleCollectionSelectionChanged = (collections: Collection[]) => {
    search({
      ...searchPageOptions,
      collections: collections,
      currentPage: 0,
      selectedCategories: undefined,
    });
  };

  const handleCollapsibleFilterClick = () => {
    setFilterExpansion(!filterExpansion);
  };

  const handlePageChanged = (page: number) =>
    search({ ...searchPageOptions, currentPage: page });

  const handleRowsPerPageChanged = (rowsPerPage: number) =>
    search(
      {
        ...searchPageOptions,
        currentPage: 0,
        rowsPerPage: rowsPerPage,
      },
      false
    );

  const handleRawModeChanged = (rawMode: boolean) =>
    search({ ...searchPageOptions, rawMode: rawMode });

  const handleQuickDateRangeModeChange = (
    quickDateRangeMode: boolean,
    dateRange?: DateRange
  ) =>
    search({
      ...searchPageOptions,
      dateRangeQuickModeEnabled: quickDateRangeMode,
      // When the mode is changed, the date range may also need to be updated.
      // For example, if a custom date range is converted to Quick option 'All', then both start and end should be undefined.
      lastModifiedDateRange: dateRange,
      selectedCategories: undefined,
    });

  const handleLastModifiedDateRangeChange = (dateRange?: DateRange) =>
    search({
      ...searchPageOptions,
      lastModifiedDateRange: dateRange,
      selectedCategories: undefined,
    });

  const handleClearSearchOptions = () => {
    search({
      ...defaultSearchPageOptions,
      sortOrder: searchSettings?.defaultSearchSort,
    });
    setFilterExpansion(false);
  };

  const handleCopySearch = () => {
    //base institution urls have a trailing / that we need to get rid of
    const instUrl = AppConfig.baseUrl.slice(0, -1);
    const searchUrl = `${instUrl}${
      location.pathname
    }?${generateQueryStringFromSearchOptions(searchPageOptions)}`;

    navigator.clipboard
      .writeText(searchUrl)
      .then(() => {
        setShowSearchCopiedSnackBar(true);
      })
      .catch(() => handleError);
  };

  const handleOwnerChange = (owner: OEQ.UserQuery.UserDetails) =>
    search({
      ...searchPageOptions,
      owner: { ...owner },
      selectedCategories: undefined,
    });

  const handleOwnerClear = () =>
    search({
      ...searchPageOptions,
      owner: undefined,
      selectedCategories: undefined,
    });

  const handleStatusChange = (status: OEQ.Common.ItemStatus[]) =>
    search({
      ...searchPageOptions,
      status: [...status],
      selectedCategories: undefined,
    });

  const handleSearchAttachmentsChange = (searchAttachments: boolean) => {
    search({
      ...searchPageOptions,
      searchAttachments: searchAttachments,
    });
  };

  const handleSelectedCategoriesChange = (
    selectedCategories: SelectedCategories[]
  ) => {
    const getSchemaNode = (id: number) => {
      const node =
        state.status === "success" &&
        state.classifications.find((c) => c.id === id)?.schemaNode;
      if (!node) {
        throw new Error(`Unable to find schema node for classification ${id}.`);
      }
      return node;
    };

    search({
      ...searchPageOptions,
      selectedCategories: selectedCategories.map((c) => ({
        ...c,
        schemaNode: getSchemaNode(c.id),
      })),
    });
  };

  /**
   * Determines if any collapsible filters have been modified from their defaults
   */
  const areCollapsibleFiltersSet = (): boolean => {
    const fields: SearchOptionsFields[] = [
      "lastModifiedDateRange",
      "owner",
      "status",
      "searchAttachments",
    ];
    return !isEqual(
      getPartialSearchOptions(defaultSearchOptions, fields),
      getPartialSearchOptions(searchPageOptions, fields)
    );
  };

  /**
   * Determines if any search criteria has been set, including classifications, query and all filters.
   */
  const isCriteriaSet = (): boolean => {
    const fields: SearchOptionsFields[] = [
      "lastModifiedDateRange",
      "owner",
      "status",
      "searchAttachments",
      "collections",
    ];

    const isQueryOrFiltersSet = !isEqual(
      getPartialSearchOptions(defaultSearchOptions, fields),
      getPartialSearchOptions(searchPageOptions, fields)
    );

    // Field 'selectedCategories' is a bit different. Once a classification is selected, the category will persist in searchPageOptions.
    // What we really care is if we have got any category that has any classification selected.
    const isClassificationSelected: boolean =
      searchPageOptions.selectedCategories?.some(
        ({ categories }: SelectedCategories) => categories.length > 0
      ) ?? false;

    return isQueryOrFiltersSet || isClassificationSelected;
  };

  const refinePanelControls: RefinePanelControl[] = [
    {
      idSuffix: "CollectionSelector",
      title: collectionSelectorTitle,
      component: (
        <CollectionSelector
          onError={handleError}
          onSelectionChange={handleCollectionSelectionChanged}
          value={searchPageOptions.collections}
        />
      ),
      disabled: false,
      alwaysVisible: true,
    },
    {
      idSuffix: "AdvancedSearchSelector",
      title: searchStrings.advancedSearchSelector.title,
      component: (
        <AuxiliarySearchSelector
          auxiliarySearchesSupplier={getAdvancedSearchesFromServer}
          urlGeneratorForRouteLink={routes.AdvancedSearch.to}
          urlGeneratorForMuiLink={buildSelectionSessionAdvancedSearchLink}
        />
      ),
      disabled: false,
      alwaysVisible: true,
    },
    {
      idSuffix: "RemoteSearchSelector",
      title: searchStrings.remoteSearchSelector.title,
      component: (
        <AuxiliarySearchSelector
          auxiliarySearchesSupplier={getRemoteSearchesFromServer}
          urlGeneratorForRouteLink={routes.RemoteSearch.to}
          urlGeneratorForMuiLink={buildSelectionSessionRemoteSearchLink}
        />
      ),
      disabled: false,
    },
    {
      idSuffix: "DateRangeSelector",
      title: dateModifiedSelectorTitle,
      component: (
        <DateRangeSelector
          onDateRangeChange={handleLastModifiedDateRangeChange}
          onQuickModeChange={handleQuickDateRangeModeChange}
          quickOptionDropdownLabel={quickOptionDropdown}
          dateRange={searchPageOptions.lastModifiedDateRange}
          quickModeEnabled={searchPageOptions.dateRangeQuickModeEnabled}
        />
      ),
      // Before Search settings are retrieved, do not show.
      disabled: searchSettings?.searchingDisableDateModifiedFilter ?? true,
    },
    {
      idSuffix: "OwnerSelector",
      title: searchStrings.filterOwner.title,
      component: (
        <OwnerSelector
          onClearSelect={handleOwnerClear}
          onSelect={handleOwnerChange}
          value={searchPageOptions.owner}
        />
      ),
      disabled: searchSettings?.searchingDisableOwnerFilter ?? true,
    },
    {
      idSuffix: "StatusSelector",
      title: searchStrings.statusSelector.title,
      component: (
        <StatusSelector
          onChange={handleStatusChange}
          value={searchPageOptions.status}
        />
      ),
      disabled: !searchSettings?.searchingShowNonLiveCheckbox ?? true,
    },
    {
      idSuffix: "SearchAttachmentsSelector",
      title: searchStrings.searchAttachmentsSelector.title,
      component: (
        <SearchAttachmentsSelector
          value={searchPageOptions.searchAttachments}
          onChange={handleSearchAttachmentsChange}
        />
      ),
      disabled: false,
    },
  ];

  const renderSidePanel = () => {
    const getClassifications = (): Classification[] => {
      const orEmpty = (c?: Classification[]) => c ?? [];

      switch (state.status) {
        case "success":
          return orEmpty(state.classifications);
        case "searching":
          return orEmpty(state.previousClassifications);
      }

      return [];
    };

    return (
      <SidePanel
        refinePanelProps={{
          controls: refinePanelControls,
          onChangeExpansion: handleCollapsibleFilterClick,
          panelExpanded: filterExpansion,
          showFilterIcon: areCollapsibleFiltersSet(),
        }}
        classificationsPanelProps={{
          classifications: getClassifications(),
          onSelectedCategoriesChange: handleSelectedCategoriesChange,
          selectedCategories: searchPageOptions.selectedCategories,
        }}
      />
    );
  };

  const searchResult = (): OEQ.Search.SearchResult<OEQ.Search.SearchResultItem> => {
    const orDefault = (
      r?: OEQ.Search.SearchResult<OEQ.Search.SearchResultItem>
    ) => r ?? defaultPagedSearchResult;

    switch (state.status) {
      case "success":
        return orDefault(state.result);
      case "searching":
        return orDefault(state.previousResult);
    }

    return defaultPagedSearchResult;
  };

  const {
    available: totalCount,
    highlight: highlights,
    results: searchResults,
  } = searchResult();
  return (
    <>
      <Grid container spacing={2}>
        <Grid item sm={12} md={8}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <SearchBar
                query={searchPageOptions.query ?? ""}
                rawMode={searchPageOptions.rawMode}
                onQueryChange={handleQueryChanged}
                onRawModeChange={handleRawModeChanged}
                doSearch={() => search(searchPageOptions)}
              />
            </Grid>
            <Grid item xs={12}>
              <SearchResultList
                showSpinner={
                  state.status === "initialising" ||
                  state.status === "searching"
                }
                paginationProps={{
                  count: totalCount,
                  currentPage: searchPageOptions.currentPage,
                  rowsPerPage: searchPageOptions.rowsPerPage,
                  onPageChange: handlePageChanged,
                  onRowsPerPageChange: handleRowsPerPageChanged,
                }}
                orderSelectProps={{
                  value: searchPageOptions.sortOrder,
                  onChange: handleSortOrderChanged,
                }}
                refineSearchProps={{
                  showRefinePanel: () => setShowRefinePanel(true),
                  isCriteriaSet: isCriteriaSet(),
                }}
                onClearSearchOptions={handleClearSearchOptions}
                onCopySearchLink={handleCopySearch}
              >
                {searchResults.length > 0 &&
                  mapSearchResultItems(searchResults, handleError, highlights)}
              </SearchResultList>
            </Grid>
          </Grid>
        </Grid>
        <Hidden smDown>
          <Grid item md={4}>
            {renderSidePanel()}
          </Grid>
        </Hidden>
      </Grid>
      <MessageInfo
        open={showSearchCopiedSnackBar}
        onClose={() => setShowSearchCopiedSnackBar(false)}
        title={searchStrings.shareSearchConfirmationText}
        variant="success"
      />
      <Hidden mdUp>
        <Drawer
          open={showRefinePanel}
          anchor="right"
          onClose={() => setShowRefinePanel(false)}
        >
          {renderSidePanel()}
        </Drawer>
      </Hidden>
    </>
  );
};

export default SearchPage;
