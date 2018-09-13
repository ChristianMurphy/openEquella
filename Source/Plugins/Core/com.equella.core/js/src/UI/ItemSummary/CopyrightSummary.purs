module OEQ.UI.ItemSummary.CopyrightSummary where 

import Prelude

import Data.Maybe (Maybe(..), fromMaybe)
import Dispatcher.React (renderer)
import MaterialUI.List (list)
import MaterialUI.ListItem (listItem)
import MaterialUI.ListItemText (listItemText)
import MaterialUI.ListItemText as LIT
import OEQ.Data.Item (CopyrightSummary, HoldingSummary(..))
import OEQ.UI.Activation (createActivation)
import OEQ.UI.ItemSummary.MetadataList (MetaValue(..), metaEntry)
import React (ReactElement, component, unsafeCreateLeafElement)
import React.DOM (div', text)
import React.DOM.Dynamic (a)
import React.DOM.Props (href)

type CopyrightProps = {
  copyright :: CopyrightSummary
}

copyrightSummary :: CopyrightProps -> ReactElement
copyrightSummary = unsafeCreateLeafElement $ component "CopyrightSummary" $ \this -> do
  let
    render {props: {copyright: {holding}}} = let 
      attachmentLink {title,href:h} = a [href $ fromMaybe "" h] [ text title ]
      bookSection {pageCount,attachment} = listItem [] [
        list [ ] $ map metaEntry [
          {title: "Pages:", value: Text $ show pageCount},
          {title: "Resource:", value: case attachment.href of 
            Nothing -> Text attachment.title
            Just h -> React $ a [href h] [ text attachment.title ]
          }
        ], 
        createActivation {item: attachment.item, attachmentUuid: attachment.uuid}
      ]
      bookChapter {title, sections} = [ listItem [] [listItemText [ LIT.primary title] ] ] <> (bookSection <$> sections)
      renderHolding (BookSummary {totalPages,chapters}) = list [] $ bookChapter =<< chapters
      renderHolding (JournalSummary {}) = div' [ 

      ]
      in div' [
        renderHolding holding        
      ]
  pure {render: renderer render this, state:{}}