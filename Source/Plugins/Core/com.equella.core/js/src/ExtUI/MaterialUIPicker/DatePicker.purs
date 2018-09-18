module ExtUI.MaterialUIPicker.DatePicker where

-- This file is autogenerated from the typescript binding

import Prelude

import Data.JSDate (JSDate)
import Data.Maybe (Maybe)
import Data.Nullable (Nullable, toNullable)
import Effect.Uncurried (EffectFn1)
import MaterialUI.PropTypes (ReactNode, Untyped)
import MaterialUI.Properties (mkProp, IProp, mkPropRecord)
import OEQ.Utils.Dates (LuxonDate)
import Prim.Row (class Union)
import React (ReactClass, ReactElement, unsafeCreateElement, unsafeCreateLeafElement)
import Unsafe.Coerce (unsafeCoerce)

type DatePickerPropsExt r = (
  value :: Nullable JSDate {-Identifier:MaterialUiPickersDate-},
  label :: ReactNode,
  keyboard :: Boolean,
  minDate :: JSDate {-Identifier:DateType-},
  maxDate :: JSDate {-Identifier:DateType-},
  clearable :: Boolean,
  onChange :: EffectFn1 (Nullable LuxonDate) Unit {-unknownType:FunctionType-},
  disablePast :: Boolean,
  disableFuture :: Boolean,
  animateYearScrolling :: Boolean,
  openToYearSelection :: Boolean,
  leftArrowIcon :: Untyped {-Identifier:ReactNode-},
  rightArrowIcon :: Untyped {-Identifier:ReactNode-},
  renderDay :: Untyped {-Identifier:RenderDay-},
  utils :: Untyped {-Identifier:Utils-},
  shouldDisableDate :: Untyped {-unknownType:FunctionType-}
  | r
) 

type DatePickerProps = DatePickerPropsExt (

) 

foreign import datePickerClass :: forall props. ReactClass props

mkProps :: forall r r2 r3. Union r r2 r3 => {|r} -> IProp r3
mkProps = unsafeCoerce

utils :: forall r a. a -> IProp (utils :: Untyped | r)
utils = mkProp "utils" <<< (unsafeCoerce :: a -> Untyped)

datePickerU :: forall props. {|props} -> ReactElement
datePickerU = unsafeCreateLeafElement datePickerClass

datePicker :: Array (IProp DatePickerProps) -> ReactElement
datePicker = mkPropRecord >>> datePickerU

